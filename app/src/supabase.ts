import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xibxwlqxkinaowgdpwqt.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpYnh3bHF4a2luYW93Z2Rwd3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMjMwNjYsImV4cCI6MjA2MTg5OTA2Nn0.-HrR_qHoFehiP7ACTiem9i_Aq_DX18AnL4wlvdD2ZM0";
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
