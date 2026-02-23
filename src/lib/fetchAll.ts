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
            console.error(`Error fetching from ${table}:`, error);
            throw error;
        }

        if (!data || data.length === 0) {
            break; // No more data
        }

        allData = [...allData, ...data];

        // Advance by the number of rows actually returned, in case max_rows was lower than step
        from += data.length;

        // If the number of rows returned is less than what Supabase 'max_rows' configuration returns
        // we can assume it's the end of the data. 
        // We do a safe check: if it returned less than 100, it's definitely the end (since 100 is min typical max_rows).
        if (data.length < 100 && step >= 100) {
            break;
        }
    }

    // Trim if we slightly overshot the maxLimit
    return allData.slice(0, maxLimit);
}
