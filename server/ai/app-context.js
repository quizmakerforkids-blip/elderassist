// App Context — search through the app's actual data

export function searchAppContext(query, db, userId, role) {
  const results = [];

  if (!db) return results;

  const q = query.toLowerCase();

  // Search emergencies
  if (db.emergencies) {
    const userEmergencies = role === 'caregiver'
      ? db.emergencies.filter(e => {
          const elder = db.users.find(u => u.id === e.elderId);
          return elder && elder.linkedCaregiverId === userId;
        })
      : db.emergencies.filter(e => e.elderId === userId);

    for (const emg of userEmergencies) {
      const text = `${emg.description} ${emg.elderName} ${emg.status} ${emg.voiceText || ''}`.toLowerCase();
      if (q.split(' ').some(w => w.length > 2 && text.includes(w))) {
        results.push({
          type: 'emergency',
          title: `Emergency: ${emg.description}`,
          content: `${emg.elderName} — Status: ${emg.status}. Created: ${new Date(emg.createdAt).toLocaleDateString()}. ${emg.acknowledgedBy ? 'Acknowledged by ' + emg.acknowledgedBy + '.' : 'Awaiting acknowledgement.'}`,
          id: emg.id,
          score: 0.8,
        });
      }
    }
  }

  // Search users/elders
  if (db.users) {
    const connected = role === 'caregiver'
      ? db.users.filter(u => u.linkedCaregiverId === userId)
      : db.users.filter(u => u.id === userId);

    for (const user of connected) {
      const text = `${user.name} ${user.email}`.toLowerCase();
      if (q.split(' ').some(w => w.length > 2 && text.includes(w))) {
        results.push({
          type: 'person',
          title: user.name,
          content: `${user.role === 'cared' ? 'Cared person' : 'Caregiver'} — Email: ${user.email}`,
          id: user.id,
          score: 0.7,
        });
      }
    }
  }

  // Search hubs
  if (db.hubs) {
    for (const hub of db.hubs) {
      const text = `${hub.name} ${hub.deviceId} ${hub.model}`.toLowerCase();
      if (q.split(' ').some(w => w.length > 2 && text.includes(w))) {
        results.push({
          type: 'hub',
          title: hub.name,
          content: `Device: ${hub.deviceId}. Model: ${hub.model}. Status: ${hub.online ? 'Online' : 'Offline'}. Battery: ${hub.batteryLevel ?? 'N/A'}%`,
          id: hub.deviceId,
          score: 0.7,
        });
      }
    }
  }

  // Search hub events
  if (db.hubEvents) {
    for (const event of db.hubEvents) {
      const text = `${event.type} ${event.detail}`.toLowerCase();
      if (q.split(' ').some(w => w.length > 2 && text.includes(w))) {
        results.push({
          type: 'hub_event',
          title: event.type.replace(/_/g, ' ').toLowerCase(),
          content: `${event.detail} — ${new Date(event.createdAt).toLocaleString()}`,
          id: event.id,
          score: 0.6,
        });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}
