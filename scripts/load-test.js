import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.05'], // Request failures must be below 5%
    http_req_duration: ['p(95)<1500'], // 95% of requests must complete below 1.5s
  },
};

export default function () {
  const baseUrl = __ENV.BACKEND_URL || 'http://localhost:3000';
  const targetUrl = `${baseUrl.replace(/\/+$/, '')}/api/health`;

  const res = http.get(targetUrl, {
    headers: {
      'Accept': 'application/json',
    },
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
  });

  // Brief dynamic pause simulating user interaction
  sleep(0.5 + Math.random() * 0.5);
}
