const fs = require('fs');

try {
  const devices = JSON.parse(fs.readFileSync('nuki_devices.json', 'utf8'));

  // Separate room devices from special devices
  const roomDevices = devices.filter(d => /^[0-9]{3}$/.test(d.name)).sort((a, b) => a.name.localeCompare(b.name));
  const specialDevices = devices.filter(d => !/^[0-9]{3}$/.test(d.name)).sort((a, b) => a.name.localeCompare(b.name));

  console.log('=== ROOM DEVICES ===');
  console.log('# Room device IDs for dynamic lookup');
  roomDevices.forEach(device => {
    console.log(`NUKI_ROOM_${device.name}_ID="${device.smartlockId}"`);
  });

  console.log('');
  console.log('=== SPECIAL LOCATION DEVICES ===');
  console.log('# Main system devices');
  specialDevices.forEach(device => {
    let varName = device.name.toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/, '');

    // Special handling for known devices
    if (device.name === 'Borivojova Entry door') varName = 'BORIVOJOVA_ENTRY';
    else if (device.name === 'Řehořova') varName = 'REHOROVA';
    else if (device.name === 'Main Door') varName = 'MAIN_DOOR';
    else if (device.name === 'Laundry') varName = 'LAUNDRY';
    else if (device.name === 'Luggage') varName = 'LUGGAGE';

    console.log(`NUKI_${varName}_ID="${device.smartlockId}"`);
  });

  console.log('');
  console.log('=== LEGACY MAPPINGS (for backward compatibility) ===');
  console.log('# These are the current environment variables');
  console.log('NUKI_MAIN_ENTRANCE_ID="18120565789"  # Main Door');
  console.log('NUKI_LUGGAGE_ROOM_ID="18154937741"   # Luggage');
  console.log('NUKI_LAUNDRY_ROOM_ID="18090678500"   # Laundry');
  console.log('# Note: Room IDs will be resolved dynamically');

  console.log('');
  console.log('=== SUMMARY ===');
  console.log(`Total Room Devices: ${roomDevices.length}`);
  console.log(`Total Special Devices: ${specialDevices.length}`);
  console.log(`Total Devices: ${devices.length}`);

} catch (error) {
  console.error('Error:', error.message);
}