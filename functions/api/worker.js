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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;
    const method = request.method;

    // Remove /api prefix if present
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
      // AUTHENTICATION ENDPOINTS
      // ============================================
      
          // ============================================
          // ============================================


// AUTHENTICATION ENDPOINTS (Admins + Members)
// ============================================

if (path === '/auth/login' && method === 'POST') {
  const { email, password } = await request.json();

  if (!email || !password) {
    return jsonResponse({ error: 'Email and password required' }, 400);
  }

  // 1️⃣ Try Admin login
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

  // 2️⃣ Try Member or Leader login
  const member = await env.DB.prepare(
    'SELECT * FROM club_members WHERE email = ? AND password = ?'
  ).bind(email, password).first();

  if (member) {
    // Fetch clubs this member joined
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
        role: leaderClub ? 'Leader' : member.role || 'Member',
        clubs: clubIds,
        leaderOf: leaderClub ? leaderClub.id : null,
        type: leaderClub ? 'Leader' : 'Member'
      }
    });
  }
// Check if this member is a leader of any club
const leaderClub = await env.DB.prepare(
  'SELECT id, name FROM clubs WHERE leader_id = ?'
).bind(member.id).first();

return jsonResponse({
  user: {
    id: member.id,
    name: member.name,
    email: member.email,
    student_id: member.student_id,
    role: leaderClub ? 'Leader' : member.role || 'Member',
    leaderOf: leaderClub ? leaderClub.id : null,
    type: leaderClub ? 'Leader' : 'Member'
  }
});

  // 3️⃣ Invalid credentials
  return jsonResponse({ error: 'Invalid email or password' }, 401);
}
// ============================================
// MEMBERS ENDPOINT - For Admin Leader Assignment
// ============================================
if (path === '/members' && method === 'GET') {
  const members = await env.DB.prepare(`
    SELECT id, name, email, student_id, role
    FROM club_members
    ORDER BY name ASC
  `).all();

  return jsonResponse({ members: members.results });
}



      // ============================================
      // CLUBS ENDPOINTS
      // ============================================
      


// ✅ Get membership info for a specific club
if (path.match(/^\/clubs\/\d+\/membership$/) && method === 'GET') {
  const clubId = parseInt(path.split('/')[2]);
  const result = await env.DB.prepare(
    'SELECT * FROM membership WHERE club_id = ?'
  ).bind(clubId).first();
  return jsonResponse(result || {});
}

      // POST /clubs - Create new club
      if (path === '/clubs' && method === 'POST') {
        const { name, description, image, adminId, leaderId } = await request.json();
        
        if (!name || !description || !image) {
          return jsonResponse({ error: 'Name, description, and image required' }, 400);
        }

        const result = await env.DB.prepare(
          'INSERT INTO clubs (name, description, image, admin_id, leader_id) VALUES (?, ?, ?, ?, ?) RETURNING *'
        ).bind(name, description, image, adminId || null, leaderId || null).first();

        return jsonResponse({
          club: {
            id: result.id,
            name: result.name,
            description: result.description,
            image: result.image,
            adminId: result.admin_id,
            leaderId: result.leader_id,
            members: [],
            announcements: [],
            events: []
          }
        }, 201);
      }

      // ============================================
// MEMBERS ENDPOINT - For Admin Leader Assignment
// ============================================
if (path === '/members' && method === 'GET') {
  const members = await env.DB.prepare(`
    SELECT id, name, email, student_id, role
    FROM club_members
    ORDER BY name ASC
  `).all();

  return jsonResponse({ members: members.results });
}


      // PUT /clubs/:id - Update club
      if (path.match(/^\/clubs\/\d+$/) && method === 'PUT') {
        const clubId = parseInt(path.split('/')[2]);
        const { name, description, image, leaderId } = await request.json();

        if (!name && !description && !image && !leaderId) {
          return jsonResponse({ error: 'At least one field required' }, 400);
        }

        const club = await env.DB.prepare('SELECT * FROM clubs WHERE id = ?').bind(clubId).first();
        
        if (!club) {
          return jsonResponse({ error: 'Club not found' }, 404);
        }

        await env.DB.prepare(
          'UPDATE clubs SET name = COALESCE(?, name), description = COALESCE(?, description), image = COALESCE(?, image), leader_id = COALESCE(?, leader_id) WHERE id = ?'
        ).bind(name || null, description || null, image || null, leaderId || null, clubId).run();

        return jsonResponse({ message: 'Club updated successfully' });
      }

      
     // DELETE /clubs/:id - Delete club
    if (path.match(/^\/clubs\/\d+$/) && method === 'DELETE') {

        const clubId = parseInt(path.split('/')[2]);

        const club = await env.DB.prepare('SELECT * FROM clubs WHERE id = ?').bind(clubId).first();
        
        if (!club) {
          return jsonResponse({ error: 'Club not found' }, 404);
        }

        await env.DB.prepare('DELETE FROM clubs WHERE id = ?').bind(clubId).run();

        return jsonResponse({ message: 'Club deleted successfully' });
      }

if (path.match(/^\/clubs\/\d+\/join$/) && method === 'POST') {
  const clubId = parseInt(path.split('/')[2]);
  const { memberId } = await request.json();


  if (!memberId) return jsonResponse({ error: 'Member ID required' }, 400);

  const existing = await env.DB.prepare(
    'SELECT id FROM club_member_links WHERE club_id = ? AND member_id = ?'
  ).bind(clubId, memberId).first();

  if (existing) return jsonResponse({ error: 'Already a member of this club' }, 409);

  await env.DB.prepare(
    'INSERT INTO club_member_links (club_id, member_id, joined_at) VALUES (?, ?, datetime("now"))'
  ).bind(clubId, memberId).run();

  return jsonResponse({ message: 'Successfully joined club' });
}


if (path.match(/^\/clubs\/\d+\/leave$/) && method === 'POST') {
  const clubId = parseInt(path.split('/')[2]);
  const { memberId } = await request.json(); // ✅ correct key

  if (!memberId) return jsonResponse({ error: 'Member ID required' }, 400);

  // ✅ Step 1: Confirm the link exists
  const membership = await env.DB.prepare(
    'SELECT id FROM club_member_links WHERE club_id = ? AND member_id = ?'
  ).bind(clubId, memberId).first();

  if (!membership)
    return jsonResponse({ error: 'Not a member of this club' }, 404);

  // ✅ Step 2: Delete the link
  await env.DB.prepare(
    'DELETE FROM club_member_links WHERE club_id = ? AND member_id = ?'
  ).bind(clubId, memberId).run();

  // ✅ Step 3: Confirm success
  return jsonResponse({ message: 'Successfully left club' });
}

// DELETE /clubs/:id/members/:memberId - leader removes a member
if (path.match(/^\/clubs\/\d+\/members\/\d+$/) && method === 'DELETE') {
  const parts = path.split('/');
  const clubId = parseInt(parts[2]);
  const memberId = parseInt(parts[4]);

  // Check club exists
  const club = await env.DB.prepare('SELECT * FROM clubs WHERE id = ?').bind(clubId).first();
  if (!club) return jsonResponse({ error: 'Club not found' }, 404);

  // Remove from link table
  await env.DB.prepare(
    'DELETE FROM club_member_links WHERE club_id = ? AND member_id = ?'
  ).bind(clubId, memberId).run();

  return jsonResponse({ message: 'Member removed successfully' });
}




      // POST /clubs/:id/announcements - Post club announcement
      if (path.match(/^\/clubs\/\d+\/announcements$/) && method === 'POST') {
        const clubId = parseInt(path.split('/')[2]);
        const { text } = await request.json();

        if (!text) {
          return jsonResponse({ error: 'Announcement text required' }, 400);
        }

        const club = await env.DB.prepare('SELECT * FROM clubs WHERE id = ?').bind(clubId).first();
        if (!club) {
          return jsonResponse({ error: 'Club not found' }, 404);
        }

        const result = await env.DB.prepare(
          'INSERT INTO club_announcements (club_id, text) VALUES (?, ?) RETURNING *, datetime(created_at) as date'
        ).bind(clubId, text).first();

        return jsonResponse({ announcement: result }, 201);
      }

      // GET /clubs/:id/announcements - Get club announcements
      if (path.match(/^\/clubs\/\d+\/announcements$/) && method === 'GET') {
        const clubId = parseInt(path.split('/')[2]);

        const announcements = await env.DB.prepare(
          'SELECT id, text, datetime(created_at) as date FROM club_announcements WHERE club_id = ? ORDER BY created_at DESC'
        ).bind(clubId).all();

        return jsonResponse({ announcements: announcements.results });
      }

      // DELETE /clubs/:clubId/announcements/:id - Delete club announcement
      if (path.match(/^\/clubs\/\d+\/announcements\/\d+$/) && method === 'DELETE') {
        const parts = path.split('/');
        const clubId = parseInt(parts[2]);
        const announcementId = parseInt(parts[4]);

        await env.DB.prepare(
          'DELETE FROM club_announcements WHERE id = ? AND club_id = ?'
        ).bind(announcementId, clubId).run();

        return jsonResponse({ message: 'Announcement deleted successfully' });
      }

      // ============================================
      // GENERAL ANNOUNCEMENTS ENDPOINTS
      // ============================================
      
      // GET /announcements - Get all general announcements
      if (path === '/announcements' && method === 'GET') {
        const announcements = await env.DB.prepare(
          'SELECT id, text, datetime(created_at) as date FROM general_announcements ORDER BY created_at DESC'
        ).all();

        return jsonResponse({ announcements: announcements.results });
      }

      // POST /announcements - Create general announcement
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

      // DELETE /announcements/:id - Delete general announcement
      if (path.match(/^\/announcements\/\d+$/) && method === 'DELETE') {
        const announcementId = parseInt(path.split('/')[2]);

        await env.DB.prepare(
          'DELETE FROM general_announcements WHERE id = ?'
        ).bind(announcementId).run();

        return jsonResponse({ message: 'Announcement deleted successfully' });
      }

      // ============================================
      // EVENTS ENDPOINTS
      // ============================================
      
      // GET /events - Get all events
      if (path === '/events' && method === 'GET') {
        const events = await env.DB.prepare(
          'SELECT e.id, e.title, e.description, e.event_date as date, e.club_id, c.name as club_name FROM events e LEFT JOIN clubs c ON e.club_id = c.id ORDER BY e.event_date ASC'
        ).all();

        return jsonResponse({ events: events.results });
      }

      // GET /events/:id - Get specific event
      if (path.match(/^\/events\/\d+$/) && method === 'GET') {
        const eventId = parseInt(path.split('/')[2]);

        const event = await env.DB.prepare(
          'SELECT e.id, e.title, e.description, e.event_date as date, e.club_id, c.name as club_name FROM events e LEFT JOIN clubs c ON e.club_id = c.id WHERE e.id = ?'
        ).bind(eventId).first();

        if (!event) {
          return jsonResponse({ error: 'Event not found' }, 404);
        }

        return jsonResponse({ event });
      }

      // POST /events - Create event
      if (path === '/events' && method === 'POST') {
        const { title, description, date, clubId } = await request.json();

        if (!title || !description || !date) {
          return jsonResponse({ error: 'Title, description, and date required' }, 400);
        }

        // Validate club exists if clubId provided
        if (clubId) {
          const club = await env.DB.prepare('SELECT id FROM clubs WHERE id = ?').bind(clubId).first();
          if (!club) {
            return jsonResponse({ error: 'Club not found' }, 404);
          }
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

      // PUT /events/:id - Update event
      if (path.match(/^\/events\/\d+$/) && method === 'PUT') {
        const eventId = parseInt(path.split('/')[2]);
        const { title, description, date, clubId } = await request.json();

        const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(eventId).first();
        
        if (!event) {
          return jsonResponse({ error: 'Event not found' }, 404);
        }

        await env.DB.prepare(
          'UPDATE events SET title = COALESCE(?, title), description = COALESCE(?, description), event_date = COALESCE(?, event_date), club_id = COALESCE(?, club_id) WHERE id = ?'
        ).bind(title || null, description || null, date || null, clubId || null, eventId).run();

        return jsonResponse({ message: 'Event updated successfully' });
      }

      // DELETE /events/:id - Delete event
      if (path.match(/^\/events\/\d+$/) && method === 'DELETE') {
        const eventId = parseInt(path.split('/')[2]);

        const event = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(eventId).first();
        
        if (!event) {
          return jsonResponse({ error: 'Event not found' }, 404);
        }

        await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(eventId).run();

        return jsonResponse({ message: 'Event deleted successfully' });
      }

      // ============================================
      // USERS ENDPOINTS
      // ============================================
      
      // GET /users - Get all users
      if (path === '/users' && method === 'GET') {
        const users = await env.DB.prepare(
          'SELECT id, email, role, datetime(created_at) as created_at FROM users'
        ).all();

        return jsonResponse({ users: users.results });
      }

      // GET /users/:id - Get specific user
      if (path.match(/^\/users\/\d+$/) && method === 'GET') {
        const userId = parseInt(path.split('/')[2]);

        const user = await env.DB.prepare(
          'SELECT id, email, role, datetime(created_at) as created_at FROM users WHERE id = ?'
        ).bind(userId).first();

        if (!user) {
        }

        const clubs = await env.DB.prepare(
          'SELECT c.id, c.name FROM clubs c JOIN club_members cm ON c.id = cm.club_id WHERE cm.user_id = ?'
        ).bind(userId).all();

        return jsonResponse({
          user: {
            ...user,
            clubs: clubs.results
          }
        });
      }

      // PUT /users/:id - Update user
      if (path.match(/^\/users\/\d+$/) && method === 'PUT') {
        const userId = parseInt(path.split('/')[2]);
        const { email, password, role } = await request.json();

        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
        
        if (!user) {
          return jsonResponse({ error: 'User not found' }, 404);
        }

        if (role && !['Admin', 'Leader', 'Member'].includes(role)) {
          return jsonResponse({ error: 'Invalid role' }, 400);
        }

        await env.DB.prepare(
          'UPDATE users SET email = COALESCE(?, email), password = COALESCE(?, password), role = COALESCE(?, role) WHERE id = ?'
        ).bind(email || null, password || null, role || null, userId).run();

        return jsonResponse({ message: 'User updated successfully' });
      }

      // DELETE /users/:id - Delete user
      if (path.match(/^\/users\/\d+$/) && method === 'DELETE') {
        const userId = parseInt(path.split('/')[2]);

        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
        
        if (!user) {
          return jsonResponse({ error: 'User not found' }, 404);
        }

        await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

        return jsonResponse({ message: 'User deleted successfully' });
      }

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

  return jsonResponse({ message: 'Profile updated successfully' });
}


      // ============================================
      // STATS ENDPOINT
      // ============================================
      
      // GET /stats - Get platform statistics
      if (path === '/stats' && method === 'GET') {
        const clubsCount = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM clubs'
        ).first();

        const usersCount = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM users'
        ).first();

        const eventsCount = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM events'
        ).first();

        const membersCount = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM club_members'
        ).first();

        return jsonResponse({
          stats: {
            totalClubs: clubsCount.count,
            totalUsers: usersCount.count,
            totalEvents: eventsCount.count,
            totalMemberships: membersCount.count
          }
        });
      }
// ============================================
// MEMBER PROFILE ENDPOINTS
// ============================================

// PUT /members/:id → Update profile info
if (/^\/members\/\d+$/.test(path) && method === 'PUT') {
  const memberId = Number(path.split('/')[2]);
  const body = await request.json();

  // 🧩 Validate that the member exists
  const existing = await env.DB.prepare(
    'SELECT id FROM club_members WHERE id = ?'
  ).bind(memberId).first();

  if (!existing) {
    return jsonResponse({ error: 'Member not found' }, 404);
  }

  // 🧠 Update only provided fields
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

  return jsonResponse({ message: 'Profile updated successfully' });
}

// GET /members/:id → Fetch profile info + club details
if (/^\/members\/\d+$/.test(path) && method === 'GET') {
  const memberId = Number(path.split('/')[2]);

  const member = await env.DB.prepare(`
    SELECT id, name, username, email, about_me, year_section, course, birthday, club_id, role
    FROM club_members
    WHERE id = ?
  `).bind(memberId).first();

  if (!member) return jsonResponse({ error: 'Member not found' }, 404);

  // If member has a joined club, fetch it
  let club = null;
  if (member.club_id) {
    club = await env.DB.prepare('SELECT id, name, description, image FROM clubs WHERE id = ?')
      .bind(member.club_id)
      .first();
  }

  return jsonResponse({
    member,
    club
  });
}
if (path.match(/^\/clubs\/\d+$/) && method === 'GET') {
  const clubId = parseInt(path.split('/')[2]);

  const club = await env.DB.prepare('SELECT * FROM clubs WHERE id = ?').bind(clubId).first();
  if (!club) return jsonResponse({ error: 'Club not found' }, 404);

  const members = await env.DB.prepare(`
    SELECT cm.id, cm.name, cm.role
    FROM club_members cm
    JOIN club_member_links cml ON cm.id = cml.member_id
    WHERE cml.club_id = ?
  `).bind(clubId).all();

  const announcements = await env.DB.prepare(
    'SELECT id, text, datetime(created_at) as date FROM club_announcements WHERE club_id = ? ORDER BY created_at DESC'
  ).bind(clubId).all();

  const events = await env.DB.prepare(
    'SELECT id, title, description, event_date as date FROM events WHERE club_id = ? ORDER BY event_date ASC'
  ).bind(clubId).all();

  return jsonResponse({
    club: {
      id: club.id,
      name: club.name,
      description: club.description,
      image: club.image,
      adminId: club.admin_id,
      leaderId: club.leader_id,
      members: members.results,
      announcements: announcements.results,
      events: events.results
    }
  });
}


     // ============================================
      // HEALTH CHECK
      // ============================================
      
      // GET / or GET /health - Health check
      if ((path === '/' || path === '/health') && method === 'GET') {
        return jsonResponse({
          status: 'healthy',
          message: 'ClubHub API is running',
          timestamp: new Date().toISOString(),
          database: 'connected'
        });
      }

      // No route matched
      return jsonResponse({ 
        error: 'Endpoint not found', 
        path, 
        method,
        hint: 'Check API documentation'
      }, 404);

    } catch (error) {
      console.error('❌ API Error:', error);
      return jsonResponse({ 
        error: error.message,
        stack: error.stack
      }, 500);
    }
  }
};