
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually since we are running with node
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  console.log('Checking connection to Supabase...');
  const { data, error } = await supabase.from('players').select('count', { count: 'exact', head: true });
  
  if (error) {
    // If table doesn't exist, Supabase (PostgREST) usually returns a 404 or specific error
    console.log('Error checking table:', error.message);
    if (error.code === '42P01') { // undefined_table
        console.log('Table "players" does NOT exist.');
    } else {
        console.log('Connection successful, but received error (might be RLS or other):', error.message);
    }
  } else {
    console.log('Table "players" exists. Connection successful.');
  }
}

checkTable();
