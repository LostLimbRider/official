export const seedEvents = [
  {
    id: 'ev-seed-001',
    title: 'LLR Weekly Ride',
    date: '2026-07-30',
    endDate: '',
    time: '09:00',
    category: 'ride',
    location: 'Fort Dodge, IA',
    description: 'Weekly group ride through Webster County. All riders welcome. Kickstands up at 9 AM.',
    createdAt: '2026-07-27T00:00:00Z',
  },
  {
    id: 'ev-seed-002',
    title: 'Planning Committee Meeting',
    date: '2026-08-05',
    endDate: '',
    time: '18:30',
    category: 'meeting',
    location: 'Fort Dodge Public Library',
    description: 'Monthly planning committee meeting. Open to anyone who wants to help organize events.',
    createdAt: '2026-07-27T00:00:00Z',
  },
  {
    id: 'ev-seed-003',
    title: 'Iowa State Fair — LLR Booth',
    date: '2026-08-13',
    endDate: '2026-08-23',
    time: '10:00',
    category: 'community',
    location: 'Iowa State Fairgrounds, Des Moines',
    description: 'Lost Limb Riders will have a booth at the Iowa State Fair. Come visit, learn about the mission, and meet the community.',
    createdAt: '2026-07-27T00:00:00Z',
  },
  {
    id: 'ev-seed-004',
    title: 'Inaugural Freedom Ride',
    date: '2026-08-15',
    endDate: '',
    time: '09:00',
    category: 'ride',
    location: 'Fort Dodge, IA',
    description: 'The first official Lost Limb Riders group ride through Webster County. All riders welcome.',
    createdAt: '2026-07-27T00:00:00Z',
  },
  {
    id: 'ev-seed-005',
    title: 'Community Cookout & Fundraiser',
    date: '2026-08-22',
    endDate: '',
    time: '11:00',
    category: 'fundraiser',
    location: 'Luther College, Decorah, IA',
    description: 'Food, music, and community. Proceeds go toward prosthetic assistance and peer mentoring programs.',
    createdAt: '2026-07-27T00:00:00Z',
  },
  {
    id: 'ev-seed-006',
    title: 'Peer Visitor Training',
    date: '2026-09-10',
    endDate: '',
    time: '13:00',
    category: 'meeting',
    location: 'Unity Point Hospital, Fort Dodge',
    description: 'Training session for new peer visitors. Learn how to support and mentor amputees during recovery.',
    createdAt: '2026-07-27T00:00:00Z',
  },
  {
    id: 'ev-seed-007',
    title: 'Fall Rally & Poker Run',
    date: '2026-10-03',
    endDate: '',
    time: '10:00',
    category: 'rally',
    location: 'Fort Dodge, IA',
    description: 'Annual fall rally featuring a poker run, live music, guest speakers, and food trucks.',
    createdAt: '2026-07-27T00:00:00Z',
  },
  {
    id: 'ev-seed-008',
    title: 'Thanksgiving Ride',
    date: '2026-11-21',
    endDate: '',
    time: '09:00',
    category: 'ride',
    location: 'Fort Dodge, IA',
    description: 'Pre-Thanksgiving group ride celebrating gratitude and community.',
    createdAt: '2026-07-27T00:00:00Z',
  },
  {
    id: 'ev-seed-009',
    title: 'New Year Kickoff Rally',
    date: '2027-01-10',
    endDate: '',
    time: '11:00',
    category: 'rally',
    location: 'Fort Dodge, IA',
    description: 'Ring in the new year with Lost Limb Riders. Goal-setting, planning, and celebrating another year of purpose.',
    createdAt: '2026-07-27T00:00:00Z',
  },
];

export const newsletterTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lost Limb Riders Newsletter</title>
</head>
<body style="margin:0;padding:0;background:#050505;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:0;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#ff6a00 0%,#c94f00 100%);padding:36px 32px;text-align:center;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;color:#fff;font-size:26px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;">
                Lost Limb Riders
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:14px;font-weight:600;">
                Biweekly Newsletter · {{DATE_RANGE}}
              </p>
            </td>
          </tr>

          <!-- Personal greeting -->
          <tr>
            <td style="background:#101010;padding:28px 32px 12px;">
              <p style="margin:0;color:#fff;font-size:16px;font-weight:700;">
                Hey {{NAME}},
              </p>
            </td>
          </tr>

          <!-- Custom message -->
          <tr>
            <td style="background:#101010;padding:8px 32px 20px;">
              {{MESSAGE}}
              <p style="margin:12px 0 0;color:#b7b7b7;font-size:14px;">
                Below is what is coming up on the calendar. Mark your dates and spread the word.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <div style="border-top:1px solid rgba(255,255,255,.12);margin:0;"></div>
            </td>
          </tr>

          <!-- Events heading -->
          <tr>
            <td style="padding:24px 32px 8px;">
              <h2 style="margin:0;color:#ff6a00;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;">
                Upcoming Events
              </h2>
            </td>
          </tr>

          <!-- Events list -->
          <tr>
            <td style="padding:8px 32px 24px;">
              {{EVENTS_LIST}}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <div style="border-top:1px solid rgba(255,255,255,.12);margin:0;"></div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:24px 32px;text-align:center;">
              <a href="https://lostlimbriders.org/events.html"
                 style="display:inline-block;background:#ff6a00;color:#fff;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:.04em;text-decoration:none;padding:14px 36px;border-radius:8px;">
                View All Events
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0a0a0a;padding:28px 32px;border-radius:0 0 12px 12px;border-top:1px solid rgba(255,255,255,.08);">
              <p style="margin:0 0 8px;color:#b7b7b7;font-size:13px;text-align:center;">
                Lost Limb Riders — One Ride. One Mission. One Community.
              </p>
              <p style="margin:0 0 8px;color:#777;font-size:12px;text-align:center;">
                <a href="https://lostlimbriders.org" style="color:#ff6a00;text-decoration:none;">lostlimbriders.org</a>
                &nbsp;·&nbsp;
                <a href="mailto:john.thompson@lostlimbriders.org" style="color:#ff6a00;text-decoration:none;">john.thompson@lostlimbriders.org</a>
              </p>
              <p style="margin:0;color:#555;font-size:11px;text-align:center;">
                You are receiving this because you signed up at lostlimbriders.org.<br>
                <a href="mailto:john.thompson@lostlimbriders.org?subject=unsubscribe" style="color:#777;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
