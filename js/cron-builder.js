// Cron Expression Builder
class CronBuilder {
    constructor() {
        this.minute = '*';
        this.hour = '*';
        this.dayOfMonth = '*';
        this.month = '*';
        this.dayOfWeek = '*';
    }

    getExpression() {
        return `${this.minute} ${this.hour} ${this.dayOfMonth} ${this.month} ${this.dayOfWeek}`;
    }

    getDescription() {
        const descriptions = {
            '* * * * *': 'Every minute',
            '*/5 * * * *': 'Every 5 minutes',
            '0 * * * *': 'Every hour',
            '0 0 * * *': 'Daily at midnight',
            '0 9 * * *': 'Daily at 9:00 AM',
            '0 0 * * 0': 'Weekly on Sunday at midnight',
            '0 0 1 * *': 'Monthly on the 1st at midnight',
            '0 0 1 1 *': 'Yearly on Jan 1st at midnight'
        };

        const expr = this.getExpression();
        return descriptions[expr] || 'Custom schedule';
    }

    getNextRuns(count = 5) {
        // Simplified next run calculator (for demo)
        const now = new Date();
        const runs = [];

        for (let i = 1; i <= count; i++) {
            const next = new Date(now.getTime() + (i * 60 * 1000)); // Simple minute increment
            runs.push(next.toLocaleString());
        }

        return runs;
    }
}

let cronBuilder = new CronBuilder();

function updateCronExpression() {
    cronBuilder.minute = document.getElementById('cron-minute').value || '*';
    cronBuilder.hour = document.getElementById('cron-hour').value || '*';
    cronBuilder.dayOfMonth = document.getElementById('cron-day').value || '*';
    cronBuilder.month = document.getElementById('cron-month').value || '*';
    cronBuilder.dayOfWeek = document.getElementById('cron-weekday').value || '*';

    const expression = cronBuilder.getExpression();
    const description = cronBuilder.getDescription();
    const nextRuns = cronBuilder.getNextRuns();

    document.getElementById('cron-expression').textContent = expression;
    document.getElementById('cron-description').textContent = description;
    document.getElementById('cron-next-runs').innerHTML = nextRuns.map(run => `<div>• ${run}</div>`).join('');
}

function loadCronPreset(preset) {
    const presets = {
        'every-minute': { minute: '*', hour: '*', day: '*', month: '*', weekday: '*' },
        'hourly': { minute: '0', hour: '*', day: '*', month: '*', weekday: '*' },
        'daily': { minute: '0', hour: '0', day: '*', month: '*', weekday: '*' },
        'weekly': { minute: '0', hour: '0', day: '*', month: '*', weekday: '0' },
        'monthly': { minute: '0', hour: '0', day: '1', month: '*', weekday: '*' }
    };

    if (presets[preset]) {
        const p = presets[preset];
        document.getElementById('cron-minute').value = p.minute;
        document.getElementById('cron-hour').value = p.hour;
        document.getElementById('cron-day').value = p.day;
        document.getElementById('cron-month').value = p.month;
        document.getElementById('cron-weekday').value = p.weekday;
        updateCronExpression();
    }
}

function copyCronExpression() {
    const expr = cronBuilder.getExpression();
    navigator.clipboard.writeText(expr).then(() => {
        alert('Cron expression copied!');
    });
}
