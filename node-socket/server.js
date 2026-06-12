const { Server } = require('socket.io');

const io = new Server(3000, {
  cors: { origin: '*' }
});

const PHP_API = 'http://php-api:80';

// Track each user's conversation state
const sessions = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Initialize session
  sessions[socket.id] = { step: 0 };

  // Send welcome message
  socket.emit('bot-message', {
    text: 'Welcome! Would you like to book a doctor appointment?',
    options: ['Yes', 'No']
  });

  socket.on('message', async (msg) => {
    const session = sessions[socket.id];

    switch (session.step) {
      case 0: // Waiting for yes/no
        if (msg.toLowerCase() === 'yes') {
          session.step = 1;
          const categories = await fetchAPI('/categories');
          session.categories = categories;
          socket.emit('bot-message', {
            text: 'Please select a category:',
            options: categories.map(c => c.name)
          });
        } else {
          socket.emit('bot-message', {
            text: 'No problem! Let me know if you change your mind.',
            options: ['Yes', 'No']
          });
        }
        break;

      case 1: // Category selected
        const category = session.categories.find(c => c.name === msg);
        if (!category) {
          socket.emit('bot-message', { text: 'Please select a valid category.', options: session.categories.map(c => c.name) });
          return;
        }
        session.selectedCategory = category;
        session.step = 2;
        const doctors = await fetchAPI(`/doctors?category_id=${category.id}`);
        session.doctors = doctors;
        socket.emit('bot-message', {
          text: `Doctors available in ${category.name}:`,
          options: doctors.map(d => d.name)
        });
        break;

      case 2: // Doctor selected
        const doctor = session.doctors.find(d => d.name === msg);
        if (!doctor) {
          socket.emit('bot-message', { text: 'Please select a valid doctor.', options: session.doctors.map(d => d.name) });
          return;
        }
        session.selectedDoctor = doctor;
        session.step = 3;
        socket.emit('bot-message', {
          text: `You selected ${doctor.name}. Please enter your preferred date (e.g., 2025-02-15):`,
          options: []
        });
        break;

      case 3: // Date entered
        session.selectedDate = msg;
        session.step = 4;
        socket.emit('bot-message', {
          text: 'Please select a time slot:',
          options: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM']
        });
        break;

      case 4: // Time selected
        session.selectedTime = msg;
        session.step = 5;
        socket.emit('bot-message', {
          text: `Please confirm your booking:\n- Category: ${session.selectedCategory.name}\n- Doctor: ${session.selectedDoctor.name}\n- Date: ${session.selectedDate}\n- Time: ${session.selectedTime}`,
          options: ['Confirm', 'Cancel']
        });
        break;

      case 5: // Confirm or cancel
        if (msg.toLowerCase() === 'confirm') {
          socket.emit('bot-message', {
            text: '✅ Appointment booked successfully! You will receive a confirmation shortly.',
            options: ['Book Another', 'Exit']
          });
        } else {
          socket.emit('bot-message', {
            text: '❌ Booking cancelled.',
            options: ['Book Another', 'Exit']
          });
        }
        session.step = 6;
        break;

      case 6: // Book another or exit
        if (msg.toLowerCase() === 'book another') {
          sessions[socket.id] = { step: 0 };
          socket.emit('bot-message', {
            text: 'Would you like to book a doctor appointment?',
            options: ['Yes', 'No']
          });
        } else {
          socket.emit('bot-message', { text: 'Thank you! Have a great day. 👋', options: [] });
        }
        break;
    }
  });

  socket.on('disconnect', () => {
    delete sessions[socket.id];
    console.log('User disconnected:', socket.id);
  });
});

async function fetchAPI(endpoint) {
  try {
    const res = await fetch(`${PHP_API}${endpoint}`);
    return await res.json();
  } catch (err) {
    console.error('PHP API error:', err.message);
    return [];
  }
}

console.log('Socket server running on port 3000');
