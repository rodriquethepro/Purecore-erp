import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://xkmnhvtwxrjsrpbkfqym.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrbW5odnR3eHJqc3JwYmtmcXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM0MTMsImV4cCI6MjA4ODU1OTQxM30.X4-3v8wwpdIKPGB9Qf-58RTbCd2bSOsOOpnYPaNqjJY"

export const supabase = createClient(supabaseUrl, supabaseKey)