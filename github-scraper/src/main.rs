use anyhow::{Context, Result};
use chrono::{DateTime, Duration as ChronoDuration, Utc, Local};
use dotenv::dotenv;
use reqwest::header::{AUTHORIZATION, USER_AGENT};
use serde::Deserialize;
use serde_json::json;
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::{collections::{HashMap, HashSet}, env, time::Duration};
use tokio::time::sleep;

#[derive(Debug, Deserialize)]
struct SearchResponse {
    items: Vec<SearchItem>,
}

#[derive(Debug, Deserialize)]
struct SearchItem {
    repository_url: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();
    let token = env::var("GITHUB_TOKEN").expect("GITHUB_TOKEN must be set");
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    println!("🔌 Connecting to Supabase...");
    
    // PRODUCTION OPTIMIZATION: Tuned Connection Pool for long-running servers
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .min_connections(1) // Keep at least 1 alive
        .idle_timeout(Duration::from_secs(300)) // Prevent Supabase from dropping stale connections
        .connect(&db_url)
        .await
        .context("Failed to connect to database. Check your DATABASE_URL.")?;
        
    println!("✅ Database connected. Starting hourly scraper server...");

    // PRODUCTION OPTIMIZATION: HTTP Client Timeouts to prevent indefinite hangs
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(45))
        .build()?;
    
    let languages = vec![
        "Rust", "JavaScript", "TypeScript", "Java", "cpp", "Python", "Go", "c", "php"
    ];

    // INFINITE SERVER LOOP
    loop {
        let now = Local::now();
        println!("\n========================================================");
        println!("🕒 STARTING SCRAPE CYCLE: {}", now.format("%Y-%m-%d %H:%M:%S"));
        println!("========================================================");

        for language in &languages {
            println!("\n--- 🚀 LANGUAGE: {} ---", language.to_uppercase());

            let mut unique_repos = HashSet::new();
            let mut valid_repos_found = 0;
            let mut page = 1;

            while valid_repos_found < 20 {
                let query = format!(
                    "https://api.github.com/search/issues?q=is:issue is:open label:\"good first issue\" language:{}&per_page=30&page={}",
                    language, page
                );

                let response = match client
                    .get(&query)
                    .header(USER_AGENT, "rust-github-scraper")
                    .header(AUTHORIZATION, format!("Bearer {}", token))
                    .send()
                    .await 
                {
                    Ok(r) => r,
                    Err(e) => {
                        println!("⚠️ HTTP Error fetching {}: {}", language, e);
                        break;
                    }
                };

                // PRODUCTION OPTIMIZATION: Safe JSON parsing
                let data: SearchResponse = match response.json().await {
                    Ok(parsed) => parsed,
                    Err(e) => {
                        println!("⚠️ Failed to parse JSON from GitHub API: {}", e);
                        break;
                    }
                };

                if data.items.is_empty() {
                    println!("⚠️ No more results found for {} on page {}.", language, page);
                    break;
                }

                for item in data.items {
                    if valid_repos_found >= 20 { break; }

                    let repo_full_name = item.repository_url.split("/repos/").nth(1).unwrap_or("").to_string();

                    if unique_repos.contains(&repo_full_name) || repo_full_name.is_empty() {
                        continue;
                    }
                    unique_repos.insert(repo_full_name.clone());

                    let parts: Vec<&str> = repo_full_name.split('/').collect();
                    if parts.len() != 2 { continue; }
                    let owner = parts[0];
                    let name = parts[1];

                    println!("\n📦 Processing: {}/{} | 🔗 https://github.com/{}", owner, name, repo_full_name);

                    match fetch_graphql_data(&client, &token, owner, name).await {
                        Ok(repo_data) => {
                            match process_and_save_repo(&pool, &repo_data, owner, name, language, &repo_full_name).await {
                                Ok(true) => {
                                    valid_repos_found += 1;
                                    println!("✅ [{}/20] Saved {} to Supabase", valid_repos_found, language);
                                }
                                Ok(false) => { /* Skipped due to filters */ }
                                Err(e) => println!("❌ Database Error: {}", e),
                            }
                        }
                        Err(e) => println!("⚠️ GraphQL Fetch Failed: {}", e),
                    }

                    sleep(Duration::from_millis(500)).await; // Polite API delay
                }
                page += 1;
            }
        }

        // Run database cleanup
        if let Err(e) = cleanup_database(&pool).await {
            println!("❌ Failed to cleanup database: {}", e);
        }

        let next_run = Local::now() + ChronoDuration::hours(1);
        println!("\n💤 Scrape cycle complete. Sleeping until {}...", next_run.format("%Y-%m-%d %H:%M:%S"));
        
        // Sleep for exactly 1 hour
        sleep(Duration::from_secs(3600)).await;
    }
}

// ================= DATABASE CLEANUP LOGIC =================

async fn cleanup_database(pool: &PgPool) -> Result<()> {
    println!("\n🧹 Enforcing database limits...");

    // PRODUCTION OPTIMIZATION: Use Transactions for safe, atomic deletions
    let mut tx = pool.begin().await?;

    let issues_deleted = sqlx::query(
        r#"
        DELETE FROM issues 
        WHERE url IN (
            SELECT url FROM issues 
            ORDER BY created_at DESC 
            OFFSET 2000
        )
        "#
    )
    .execute(&mut *tx)
    .await?;
    println!("   🗑️ Pruned {} old issues (Max 2000 limit).", issues_deleted.rows_affected());

    let repos_to_delete: Vec<(String,)> = sqlx::query_as(
        r#"
        SELECT full_name FROM repos 
        ORDER BY last_active DESC 
        OFFSET 200
        "#
    )
    .fetch_all(&mut *tx)
    .await?;

    let mut repos_deleted_count = 0;
    
    for repo in repos_to_delete {
        let repo_id = repo.0;
        
        sqlx::query("DELETE FROM issues WHERE repo_id = $1")
            .bind(&repo_id)
            .execute(&mut *tx)
            .await?;

        sqlx::query("DELETE FROM repos WHERE full_name = $1")
            .bind(&repo_id)
            .execute(&mut *tx)
            .await?;
            
        repos_deleted_count += 1;
    }
    
    // Commit the transaction - if anything failed above, NO data is deleted
    tx.commit().await?;
    
    println!("   🗑️ Pruned {} old repos (Max 200 limit).", repos_deleted_count);
    
    Ok(())
}

// ================= GRAPHQL ENGINE =================

async fn fetch_graphql_data(
    client: &reqwest::Client,
    token: &str,
    owner: &str,
    name: &str,
) -> Result<serde_json::Value> {
    let since = (Utc::now() - ChronoDuration::days(30)).to_rfc3339();

    let query = r#"
    query($owner: String!, $name: String!, $since: GitTimestamp!) {
      repository(owner: $owner, name: $name) {
        stargazerCount
        forkCount
        pushedAt
        issues(states: OPEN) { totalCount }
        
        owner { login }
        mentionableUsers(first: 10) { totalCount }
        codeOwnersFile: object(expression: "HEAD:CODEOWNERS") {
          ... on Blob { byteSize }
        }
        
        srcFolder: object(expression: "HEAD:src/") {
          ... on Tree { entries { name extension } }
        }
        
        defaultBranchRef {
          target { 
            ... on Commit { 
              history(since: $since) { totalCount } 
            } 
          }
        }
        
        recentIssues: issues(last: 30, states: OPEN) {
          nodes {
            title
            url
            createdAt
            assignees { totalCount }
            projectsV2(first: 1) { nodes { id } }
            labels(first: 5) { nodes { name } }
            comments(first: 1) { nodes { createdAt } }
            timelineItems(last: 5, itemTypes: [ISSUE_COMMENT]) {
              nodes { ... on IssueComment { author { login } createdAt body } }
            }
          }
        }
        
        recentPRs: pullRequests(last: 20, states: MERGED) {
          nodes {
            createdAt
            mergedAt
            additions
            deletions
            changedFiles
            totalCommentsCount
            author { login }
            mergedBy { login }
            labels(first: 5) { nodes { name } }
          }
        }
      }
    }
    "#;

    let payload = json!({
        "query": query,
        "variables": { "owner": owner, "name": name, "since": since }
    });

    let res: serde_json::Value = client
        .post("https://api.github.com/graphql")
        .header(USER_AGENT, "rust-github-scraper")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .json(&payload)
        .send()
        .await?
        .json()
        .await?;

    if let Some(errors) = res.get("errors") {
        anyhow::bail!("GraphQL Error: {}", errors);
    }

    Ok(res["data"]["repository"].clone())
}

// ================= DATA PROCESSING & DB INSERT =================

async fn process_and_save_repo(
    pool: &PgPool,
    repo: &serde_json::Value,
    _owner: &str,
    name: &str,
    language: &str,
    full_name: &str,
) -> Result<bool> {
    if repo.is_null() { return Ok(false); }

    let stars = repo["stargazerCount"].as_i64().unwrap_or(0);
    if stars < 10 {
        println!("   ⏭️ Skipping: Too few stars ({})", stars);
        return Ok(false);
    }

    let forks = repo["forkCount"].as_i64().unwrap_or(0);
    let commits_30d = repo["defaultBranchRef"]["target"]["history"]["totalCount"].as_i64().unwrap_or(0);
    
    let pushed_at_str = repo["pushedAt"].as_str().unwrap_or("");
    let last_active = DateTime::parse_from_rfc3339(pushed_at_str)
        .unwrap_or_else(|_| Utc::now().into())
        .with_timezone(&Utc);

    let solo_maintainer = repo["mentionableUsers"]["totalCount"].as_i64().unwrap_or(0) < 3;
    let has_codeowners = repo["codeOwnersFile"]["byteSize"].as_i64().unwrap_or(0) > 0;

    let mut ext_counts: HashMap<String, i32> = HashMap::new();
    if let Some(entries) = repo["srcFolder"]["entries"].as_array() {
        for entry in entries {
            if let Some(ext) = entry["extension"].as_str() {
                if !ext.is_empty() {
                    *ext_counts.entry(ext.to_string()).or_insert(0) += 1;
                }
            }
        }
    }

    let mut response_total_hrs = 0.0;
    let mut response_count = 0;
    let mut responses_under_24h = 0;

    let mut valid_issues_to_insert = Vec::new();

    if let Some(issues) = repo["recentIssues"]["nodes"].as_array() {
        for issue in issues {
            let assignee_count = issue["assignees"]["totalCount"].as_i64().unwrap_or(0);
            
            if assignee_count > 0 { continue; }

            if let (Some(created_str), Some(comments)) = (
                issue["createdAt"].as_str(),
                issue["comments"]["nodes"].as_array(),
            ) {
                if let Some(first_comment) = comments.first() {
                    if let Some(comment_created_str) = first_comment["createdAt"].as_str() {
                        if let (Ok(c), Ok(cm)) = (
                            DateTime::parse_from_rfc3339(created_str),
                            DateTime::parse_from_rfc3339(comment_created_str),
                        ) {
                            let diff_hours = (cm - c).num_hours() as f64;
                            response_total_hrs += diff_hours;
                            response_count += 1;
                            if diff_hours < 24.0 { responses_under_24h += 1; }
                        }
                    }
                }
            }
            valid_issues_to_insert.push(issue.clone());
        }
    }

    let response_time_avg = if response_count > 0 { response_total_hrs / response_count as f64 } else { 0.0 };
    let maintainer_response_24h_rate = if response_count > 0 { (responses_under_24h as f64 / response_count as f64) * 100.0 } else { 0.0 };

    let mut merge_total_hrs = 0.0;
    let mut total_lines = 0.0;
    let mut total_files = 0.0;
    let mut total_comments = 0.0;
    let mut pr_count = 0.0;
    let mut quick_wins = 0;
    let mut gfi_conversions = 0;

    if let Some(prs) = repo["recentPRs"]["nodes"].as_array() {
        for pr in prs {
            if let (Some(created_str), Some(merged_str)) = (pr["createdAt"].as_str(), pr["mergedAt"].as_str()) {
                if let (Ok(c), Ok(m)) = (
                    DateTime::parse_from_rfc3339(created_str),
                    DateTime::parse_from_rfc3339(merged_str),
                ) {
                    let diff_hours = (m - c).num_hours() as f64;
                    merge_total_hrs += diff_hours;
                    
                    if diff_hours < 48.0 { quick_wins += 1; }

                    if let Some(labels) = pr["labels"]["nodes"].as_array() {
                        let has_gfi = labels.iter().any(|l| l["name"].as_str().unwrap_or("").to_lowercase().contains("good first issue"));
                        if has_gfi { gfi_conversions += 1; }
                    }

                    total_lines += pr["additions"].as_f64().unwrap_or(0.0) + pr["deletions"].as_f64().unwrap_or(0.0);
                    total_files += pr["changedFiles"].as_f64().unwrap_or(0.0);
                    total_comments += pr["totalCommentsCount"].as_f64().unwrap_or(0.0);
                    pr_count += 1.0;
                }
            }
        }
    }

    let mut pr_merge_avg = 0.0;
    let mut normalized_difficulty: Option<f64> = None;

    if pr_count > 0.0 {
        pr_merge_avg = merge_total_hrs / pr_count;
        let avg_lines = total_lines / pr_count;
        let avg_files = total_files / pr_count;
        let avg_comments = total_comments / pr_count;
        let avg_days = pr_merge_avg / 24.0;

        let scaled_lines = (avg_lines + 1.0).ln();
        let scaled_files = (avg_files + 1.0).ln();
        let scaled_comments = (avg_comments + 1.0).ln();
        let scaled_days = (avg_days + 1.0).ln();

        let raw_score = (scaled_lines * 0.4) + (scaled_files * 0.3) + (scaled_comments * 0.2) + (scaled_days * 0.1);
        normalized_difficulty = Some(raw_score * 10.0);
    }

    let health_score = normalized_difficulty.map(|d| 100.0 - d).unwrap_or(50.0);

    let health_json = json!({
        "commits_30d": commits_30d,
        "response_time_avg_hrs": response_time_avg,
        "pr_merge_avg_hrs": pr_merge_avg,
        "maintainer_quality": {
            "solo_maintainer": solo_maintainer,
            "has_codeowners": has_codeowners,
            "response_24h_rate": maintainer_response_24h_rate
        },
        "success_indicators": {
            "quick_wins_count": quick_wins,
            "gfi_conversions": gfi_conversions,
            "total_recent_merged_prs": pr_count as i64
        },
        "src_extensions": ext_counts
    });

    // PRODUCTION OPTIMIZATION: Use Transactions for batched database operations
    // This dramatically increases write speed and guarantees ACID safety.
    let mut tx = pool.begin().await?;

    sqlx::query(
        r#"
        INSERT INTO repos (full_name, name, stars, forks, health_score, language, last_active, health_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (full_name) DO UPDATE 
        SET stars = EXCLUDED.stars, forks = EXCLUDED.forks, health_score = EXCLUDED.health_score, 
            last_active = EXCLUDED.last_active, health_json = EXCLUDED.health_json
        "#
    )
    .bind(full_name)
    .bind(name)
    .bind(stars as i32)
    .bind(forks as i32)
    .bind(health_score)
    .bind(language)
    .bind(last_active)
    .bind(&health_json)
    .execute(&mut *tx)
    .await?;

    for issue in valid_issues_to_insert {
        let title = issue["title"].as_str().unwrap_or("Untitled");
        let url = issue["url"].as_str().unwrap_or("");
        if url.is_empty() { continue; }

        let created_str = issue["createdAt"].as_str().unwrap_or("");
        let created_at = DateTime::parse_from_rfc3339(created_str)
            .unwrap_or_else(|_| Utc::now().into())
            .with_timezone(&Utc);

        let mut label_names = Vec::new();
        if let Some(labels_array) = issue["labels"]["nodes"].as_array() {
            for label in labels_array {
                if let Some(label_name) = label["name"].as_str() {
                    label_names.push(label_name.to_string());
                }
            }
        }
        
        let has_project_board = !issue["projectsV2"]["nodes"].as_array().unwrap_or(&vec![]).is_empty();
        
        let labels_json = json!({
            "tags": label_names,
            "issue_quality": {
                "has_project_overhead": has_project_board
            }
        });

        sqlx::query(
            r#"
            INSERT INTO issues (url, repo_id, title, difficulty_score, labels, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (url) DO UPDATE 
            SET title = EXCLUDED.title, difficulty_score = EXCLUDED.difficulty_score, labels = EXCLUDED.labels
            "#
        )
        .bind(url)
        .bind(full_name)
        .bind(title)
        .bind(normalized_difficulty)
        .bind(&labels_json)
        .bind(created_at)
        .execute(&mut *tx)
        .await?;
    }

    // Commit all changes for this repository together
    tx.commit().await?;

    Ok(true)
}