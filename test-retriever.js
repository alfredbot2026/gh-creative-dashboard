const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

// Overwrite the createClient to use anon key for testing if we are just calling the function
// Wait, we can't easily mock next/headers. Let's just use tsx to run a test file.
