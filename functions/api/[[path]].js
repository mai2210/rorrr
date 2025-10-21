const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  let path = url.pathname;
  const method = request.method;

  // Remove /api prefix
  if (path.startsWith('/api')) {
    path = path.substring(4);
  }

  console.log(`[${method}] ${path}`);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Check database binding
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured. Add D1 binding named "DB"' }, 500);
  }

  try {
    // ============================================
    // AUTHENTICATION
    // ============================================
    
    // ============================================
  // ============================================
// ✅ GET /clubs/:id/membership - Get membership info
// ============================================
if (path.match(/^\/clubs\/\d+\/membership$/) && method === 'GET') {
  const clubId = parseInt(path.split('/')[2]);
  const result = await env.DB.prepare(`
    SELECT membership_name, membership_number, membership_description, membership_image
    FROM membership
    WHERE club_id = ?
  `).bind(clubId).first();

  return jsonResponse(result || {});
}

// ============================================
// ✅ POST or PUT /clubs/:id/membership - Create or update membership info
// ============================================
if (path.match(/^\/clubs\/\d+\/membership$/) && (method === 'POST' || method === 'PUT')) {
  const clubId = parseInt(path.split('/')[2]);
  const { membership_name, membership_number, membership_description, membership_image } = await request.json();

  const existing = await env.DB.prepare('SELECT id FROM membership WHERE club_id = ?').bind(clubId).first();

  if (existing) {
    await env.DB.prepare(`
      UPDATE membership
      SET membership_name = ?, membership_number = ?, membership_description = ?, membership_image = ?
      WHERE club_id = ?
    `).bind(membership_name, membership_number, membership_description, membership_image, clubId).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO membership (club_id, membership_name, membership_number, membership_description, membership_image)
      VALUES (?, ?, ?, ?, ?)
    `).bind(clubId, membership_name, membership_number, membership_description, membership_image).run();
  }

  return jsonResponse({ message: 'Membership info saved successfully!' });
}

// AUTHENTICATION (Admins + Members)
// ============================================
if (path === '/auth/login' && method === 'POST') {
  const { email, password } = await request.json();

  if (!email || !password) {
    return jsonResponse({ error: 'Email and password required' }, 400);
  }

  // 1️⃣ Try to log in as Admin (from users table)
  const admin = await env.DB.prepare(
    'SELECT * FROM users WHERE email = ? AND password = ?'
  ).bind(email, password).first();

  if (admin) {
    return jsonResponse({
      user: {
        id: admin.id,
        email: admin.email,
        role: admin.role || 'Admin',
        type: 'Admin'
      }
    });
  }

  // 2️⃣ Try to log in as Member/Leader (from club_members)
  const member = await env.DB.prepare(
    'SELECT * FROM club_members WHERE email = ? AND password = ?'
  ).bind(email, password).first();

  // inside: if (member) { ... }
  // Fetch all clubs this member joined
  const joined = await env.DB.prepare(
    'SELECT club_id FROM club_member_links WHERE member_id = ?'
  ).bind(member.id).all();

  const clubIds = joined.results.map(r => r.club_id);

// Check if this member is a leader of a club
  const leaderClub = await env.DB.prepare(
    'SELECT id, name FROM clubs WHERE leader_id = ?'
  ).bind(member.id).first();

  return jsonResponse({
    user: {
      id: member.id,
      name: member.name,
      email: member.email,
      student_id: member.student_id,
      role: leaderClub ? 'Leader' : (member.role || 'Member'),
      clubs: clubIds,
      leaderOf: leaderClub ? leaderClub.id : null,
      type: leaderClub ? 'Leader' : 'Member'
    }
  });


// 3️⃣ If neither found, invalid credentials
return jsonResponse({ error: 'Invalid email or password' }, 401);
} // ✅ <-- This closes the LOGIN route properly!

   // ============================================
// AUTH REGISTER (SIGN UP)
// ============================================
if (path === '/auth/register' && method === 'POST') {
  const { name, studentID, email, password, role } = await request.json();

  if (!name || !email || !password || !studentID) {
    return jsonResponse({ error: 'All fields are required' }, 400);
  }
 
  // Check if email or student ID already exists
  const existing = await env.DB.prepare(
    'SELECT id FROM club_members WHERE email = ? OR student_id = ?'
  ).bind(email, studentID).first();

  if (existing) {
    return jsonResponse({ error: 'Email or Student ID already registered' }, 409);
  }

  // Insert new member (no club yet)
  const newMember = await env.DB.prepare(
    'INSERT INTO club_members (club_id, student_id, email, password, name, role) VALUES (?, ?, ?, ?, ?, ?) RETURNING *'
  ).bind(null, studentID, email, password, name, role || 'Member').first();

  return jsonResponse({
    message: 'Signup successful!',
    member: {
      id: newMember.id,
      name: newMember.name,
      email: newMember.email,
      student_id: newMember.student_id,
      role: newMember.role
    }
  }, 201);
}

// ============================================
// CLUBS
// ============================================

// GET /clubs - list all clubs with details
if (path === '/clubs' && method === 'GET') {
  const clubs = await env.DB.prepare('SELECT * FROM clubs').all();
  
  const clubsWithDetails = await Promise.all(
    clubs.results.map(async (club) => {
      const members = await env.DB.prepare(`
  SELECT cm.id, cm.name, cm.role
  FROM club_members cm
  JOIN club_member_links cml ON cm.id = cml.member_id
  WHERE cml.club_id = ?
`).bind(club.id).all();


      const announcements = await env.DB.prepare(
        'SELECT id, text, datetime(created_at) as date FROM club_announcements WHERE club_id = ? ORDER BY created_at DESC LIMIT 10'
      ).bind(club.id).all();
      
      const events = await env.DB.prepare(
        'SELECT id, title, description, event_date as date FROM events WHERE club_id = ? ORDER BY event_date ASC'
      ).bind(club.id).all();

      return {
        id: club.id,
        name: club.name,
        description: club.description,
        image: club.image,
        adminId: club.admin_id,
        leaderId: club.leader_id,
        members: members.results,
        announcements: announcements.results,
        events: events.results
      };
    })
  );

  return jsonResponse({ clubs: clubsWithDetails });
}

// POST /clubs/:id/join - join a club (multi-club version)
if (path.match(/^\/clubs\/\d+\/join$/) && method === 'POST') {
  const clubId = parseInt(path.split('/')[2]);
  const { memberId } = await request.json();

  if (!memberId) {
    return jsonResponse({ error: 'Member ID required' }, 400);
  }

  const club = await env.DB.prepare('SELECT * FROM clubs WHERE id = ?').bind(clubId).first();
  if (!club) {
    return jsonResponse({ error: 'Club not found' }, 404);
  }

  // Check if already in the link table
  const existing = await env.DB.prepare(
    'SELECT id FROM club_member_links WHERE club_id = ? AND member_id = ?'
  ).bind(clubId, memberId).first();

  if (existing) {
    return jsonResponse({ error: 'Already joined this club' }, 409);
  }

  // Add new membership
  await env.DB.prepare(
    'INSERT INTO club_member_links (club_id, member_id, joined_at) VALUES (?, ?, datetime("now"))'
  ).bind(clubId, memberId).run();

  return jsonResponse({ message: 'Successfully joined club' });
}

// POST /clubs/:id/leave - leave a club
if (path.match(/^\/clubs\/\d+\/leave$/) && method === 'POST') {
  const clubId = parseInt(path.split('/')[2]);
  const { memberId } = await request.json();

  if (!memberId) {
    return jsonResponse({ error: 'Member ID required' }, 400);
  }

  // Check if member is in this club
  const existing = await env.DB.prepare(
    'SELECT id FROM club_member_links WHERE club_id = ? AND member_id = ?'
  ).bind(clubId, memberId).first();

  if (!existing) {
    return jsonResponse({ error: 'Not a member of this club' }, 404);
  }

  // Remove link
  await env.DB.prepare(
    'DELETE FROM club_member_links WHERE club_id = ? AND member_id = ?'
  ).bind(clubId, memberId).run();

  return jsonResponse({ message: 'Successfully left club' });
}


// POST /clubs - create new club
if (path === '/clubs' && method === 'POST') {
  const { name, description, image, adminId, leaderId } = await request.json();

  if (!name) {
    return jsonResponse({ error: 'Club name is required' }, 400);
  }

  const result = await env.DB.prepare(
    `INSERT INTO clubs (name, description, image, admin_id, leader_id)
     VALUES (?, ?, ?, ?, ?) RETURNING *`
  ).bind(name, description || '', image || '', adminId || null, leaderId || null).first();

  return jsonResponse({ club: result }, 201);
}

// DELETE /clubs/:id - delete a club
if (path.match(/^\/clubs\/\d+$/) && method === 'DELETE') {
  const clubId = parseInt(path.split('/')[2]);

  const club = await env.DB.prepare('SELECT * FROM clubs WHERE id = ?').bind(clubId).first();

  if (!club) {
    return jsonResponse({ error: 'Club not found' }, 404);
  }

  await env.DB.prepare('DELETE FROM clubs WHERE id = ?').bind(clubId).run();

  return jsonResponse({ message: 'Club deleted successfully' });
}

    


    // ============================================
    // ANNOUNCEMENTS
    // ============================================
    
    if (path === '/announcements' && method === 'GET') {
      const announcements = await env.DB.prepare(
        'SELECT id, text, datetime(created_at) as date FROM general_announcements ORDER BY created_at DESC'
      ).all();

      return jsonResponse({ announcements: announcements.results });
    }

    if (path === '/announcements' && method === 'POST') {
      const { text } = await request.json();

      if (!text) {
        return jsonResponse({ error: 'Announcement text required' }, 400);
      }

      const result = await env.DB.prepare(
        'INSERT INTO general_announcements (text) VALUES (?) RETURNING *, datetime(created_at) as date'
      ).bind(text).first();

      return jsonResponse({ announcement: result }, 201);
    }

    

    // ============================================
    // EVENTS
    // ============================================
    
    if (path === '/events' && method === 'GET') {
      const events = await env.DB.prepare(
        'SELECT e.id, e.title, e.description, e.event_date as date, e.club_id, c.name as club_name FROM events e LEFT JOIN clubs c ON e.club_id = c.id ORDER BY e.event_date ASC'
      ).all();

      return jsonResponse({ events: events.results });
    }

    if (path === '/events' && method === 'POST') {
      const { title, description, date, clubId } = await request.json();

      if (!title || !description || !date) {
        return jsonResponse({ error: 'Title, description, and date required' }, 400);
      }

      const result = await env.DB.prepare(
        'INSERT INTO events (title, description, event_date, club_id) VALUES (?, ?, ?, ?) RETURNING *'
      ).bind(title, description, date, clubId || null).first();

      return jsonResponse({
        event: {
          id: result.id,
          title: result.title,
          description: result.description,
          date: result.event_date,
          clubId: result.club_id
        }
      }, 201);
    }
// ============================================
// FIXED: STATS
// ============================================
if (path === '/stats' && method === 'GET') {
  const clubsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM clubs').first();
  const membersCount = await env.DB.prepare('SELECT COUNT(*) as count FROM club_members').first();
  const eventsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM events').first();

  return jsonResponse({
    stats: {
      totalClubs: clubsCount.count,
      totalMembers: membersCount.count,
      totalEvents: eventsCount.count
    }
  });
}


    // ============================================
    // HEALTH CHECK
    // ============================================
    
    if (path === '/health' || path === '/') {
      return jsonResponse({
        status: 'healthy',
        message: 'ClubHub API is running',
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    }

    // ============================================
// MEMBER PROFILE ENDPOINTS
// ============================================

// PUT /members/:id → Update profile info
if (/^\/members\/\d+$/.test(path) && method === 'PUT') {
  const memberId = Number(path.split('/')[2]);
  const body = await request.json();

  const existing = await env.DB.prepare(
    'SELECT id FROM club_members WHERE id = ?'
  ).bind(memberId).first();

  if (!existing) {
    return jsonResponse({ error: 'Member not found' }, 404);
  }

  await env.DB.prepare(`
    UPDATE club_members
    SET 
      name = COALESCE(?, name),
      username = COALESCE(?, username),
      email = COALESCE(?, email),
      about_me = COALESCE(?, about_me),
      year_section = COALESCE(?, year_section),
      course = COALESCE(?, course),
      birthday = COALESCE(?, birthday)
    WHERE id = ?
  `).bind(
    body.name ?? null,
    body.username ?? null,
    body.email ?? null,
    body.about_me ?? null,
    body.year_section ?? null,
    body.course ?? null,
    body.birthday ?? null,
    memberId
  ).run();

  // 🧠 ⬇️ Paste this part here — replaces old “return jsonResponse({ message: … })”
  const updated = await env.DB.prepare(`
    SELECT id, name, username, email, about_me, year_section, course, birthday, student_id, joined_at, role
    FROM club_members
    WHERE id = ?
  `).bind(memberId).first();

  return jsonResponse({
    message: 'Profile updated successfully',
    member: updated
  });
}



    return jsonResponse({ 
      error: 'Endpoint not found', 
      path, 
      method 
    }, 404);

  } catch (error) {
    console.error('❌ API Error:', error);
    return jsonResponse({ 
      error: error.message,
      stack: error.stack
    }, 500);
  }
}
