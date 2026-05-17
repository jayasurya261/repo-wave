import { supabase } from './supabase';

/**
 * Fetches all records from a given table, optionally joining and ordering,
 * bypassing the PostgREST max_rows limit by paginating the requests.
 */
export async function fetchAllRecords(table: string, selectQuery: string, orderByColumn: string, isAscending: boolean = false, maxLimit: number = 5000) {
    let allData: any[] = [];
    let from = 0;
    const step = 999;

    while (allData.length < maxLimit) {
        let to = from + step;

        let query = supabase
            .from(table)
            .select(selectQuery)
            .order(orderByColumn, { ascending: isAscending })
            .range(from, to);

        const { data, error } = await query;

        if (error) {
            console.error(`[fetchAllRecords] Supabase error fetching "${table}":`, error.message ?? error);
            // Return whatever we have so far rather than crashing the build
            return allData.slice(0, maxLimit);
        }

        if (!data || data.length === 0) {
            break; // No more data
        }

        allData = [...allData, ...data];

        // Advance by the number of rows actually returned, in case max_rows was lower than step
        from += data.length;

        // If the number of rows returned is less than the step size, we've reached the end
        // Supabase default max_rows is 1000, so if we get fewer rows than step (999), we're done
        if (data.length < step) {
            break;
        }
    }

    // Trim if we slightly overshot the maxLimit
    return allData.slice(0, maxLimit);
}
