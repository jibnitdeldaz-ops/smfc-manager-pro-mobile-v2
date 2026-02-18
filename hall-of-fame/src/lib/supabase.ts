import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pbjkbxtaequddnvyhgho.supabase.co'
const supabaseAnonKey = 'sb_publishable_EQfzMfbnCrDWutLx_QNjzg_wVtzywda'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
