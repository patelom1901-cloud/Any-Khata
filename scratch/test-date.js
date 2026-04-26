
const todayCA = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
});
console.log('Today (en-CA, Asia/Kolkata):', todayCA);

const todayParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
}).formatToParts(new Date());

const year = todayParts.find(p => p.type === 'year')?.value;
const month = todayParts.find(p => p.type === 'month')?.value;
const day = todayParts.find(p => p.type === 'day')?.value;
const todayManual = `${year}-${month}-${day}`;
console.log('Today (Manual, Asia/Kolkata):', todayManual);

if (todayCA === todayManual) {
    console.log('Match!');
} else {
    console.log('MISMATCH!');
}
