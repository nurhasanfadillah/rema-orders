import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gbmwlowxdpwnqwvcwttk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdibXdsb3d4ZHB3bnF3dmN3dHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU0ODksImV4cCI6MjA4Mjk1MTQ4OX0.HjDJpi_TbJERicfU2Aaqyy2acA1O_7sgZ_HiYSEpmBQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);