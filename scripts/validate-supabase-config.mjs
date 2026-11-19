import dns from 'dns';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Validates Supabase configuration without printing or leaking secrets.
 */
async function validateSupabaseConfig() {
  console.log('====================================================');
  console.log('StockSmart AI — Safe Supabase Configuration Validator');
  console.log('====================================================');

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  // 1. URL Presence & Format Validation
  if (!supabaseUrl) {
    console.error('❌ [CONFIG ERROR]: VITE_SUPABASE_URL is missing or undefined.');
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch (e) {
    console.error('❌ [FORMAT ERROR]: VITE_SUPABASE_URL is not a valid URL.');
    return;
  }

  console.log(`✓ [URL FORMAT]: Valid HTTPS format (${parsedUrl.protocol}//${parsedUrl.hostname})`);

  // Extract project ref (masking full secret details)
  const hostParts = parsedUrl.hostname.split('.');
  const projectRef = hostParts[0];
  console.log(`ℹ [PROJECT REF]: "${projectRef}" (Domain: ${hostParts.slice(1).join('.')})`);

  // 2. Key Format Validation (Safe format check without exposing key bytes)
  if (!anonKey) {
    console.error('❌ [CONFIG ERROR]: VITE_SUPABASE_ANON_KEY is missing.');
  } else {
    const isLegacyJwt = anonKey.split('.').length === 3;
    const isModernOpaque = anonKey.startsWith('sb_') || anonKey.startsWith('eyJ');
    console.log(`✓ [KEY FORMAT]: Present (Length: ${anonKey.length} chars, Type: ${isLegacyJwt ? 'JWT format' : (isModernOpaque ? 'Supabase Publishable/Anon key' : 'Custom key')})`);
  }

  // 3. DNS Resolution Probe
  console.log('\n--- Probing DNS Resolution ---');
  try {
    const addresses = await dns.promises.resolve4(parsedUrl.hostname);
    console.log(`✓ [DNS RESOLVED]: Hostname successfully resolved to: ${addresses.join(', ')}`);
  } catch (err) {
    console.error(`❌ [DNS FAILED]: Code: ${err.code} (${err.message})`);
    if (err.code === 'ENOTFOUND') {
      console.warn('   Diagnostic: Authoritative DNS returned NXDOMAIN. Subdomain does not currently exist or is inactive.');
    }
    return;
  }

  // 4. HTTPS Endpoint Connectivity
  console.log('\n--- Probing HTTPS Connectivity ---');
  const pingEndpoint = `${parsedUrl.origin}/auth/v1/health`;
  
  https.get(pingEndpoint, { timeout: 8000 }, (res) => {
    console.log(`✓ [HTTPS STATUS]: HTTP ${res.statusCode} from /auth/v1/health`);
    if (res.statusCode === 200) {
      console.log('✅ Supabase Auth service is active and responsive!');
    }
  }).on('error', (err) => {
    console.error(`❌ [HTTPS CONNECTION FAILED]: ${err.message}`);
  });
}

validateSupabaseConfig().catch(console.error);
