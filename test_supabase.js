import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
    let { data, error, count } = await supabase
        .from('issues')
        .select('*', { count: 'exact' });
    console.log("Without limit:", data?.length, "Total:", count);

    let { data: limitData, error: limitError } = await supabase
        .from('issues')
        .select('*')
        .limit(5000);
    console.log("With limit 5000:", limitData?.length);

    let { data: rangeData } = await supabase
        .from('issues')
        .select('*')
        .range(0, 4999);
    console.log("With range 0-4999:", rangeData?.length);
}
testFetch();
