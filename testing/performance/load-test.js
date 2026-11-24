import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.05'],      // HTTP failure rate must stay below 5%
    http_req_duration: ['p(95)<1500'],   // 95% of requests must complete below 1.5s
  },
};

export default function () {
  const baseUrl = __ENV.BACKEND_URL || 'http://localhost:3000';
  const targetUrl = `${baseUrl.replace(/\/+$/, '')}/api/health`;

  const res = http.get(targetUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'k6-StockSmart-LoadTest/1.0',
    },
    timeout: '10s'
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has status ok': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && body.status === 'ok';
      } catch (e) {
        return false;
      }
    },
    'response time < 1500ms': (r) => r.timings.duration < 1500,
  });

  // Dynamic pause simulating user interaction
  sleep(0.5 + Math.random() * 0.5);
}
