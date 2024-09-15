document.addEventListener('DOMContentLoaded', () => {
    const targetDateInput = document.getElementById('targetDate');
    const calculateBtn = document.getElementById('calculateBtn');
    const resultDiv = document.getElementById('result');
    const toast = document.getElementById('toast');

    function calculateCountdown() {
        const targetDate = new Date(targetDateInput.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isNaN(targetDate.getTime())) {
            showToast('Please select a valid date');
            return;
        }

        if (targetDate <= today) {
            showToast('Please select a future date');
            return;
        }

        // Calculate the difference in milliseconds
        const timeDiff = targetDate.getTime() - today.getTime();
        
        // Calculate total days
        const totalDays = Math.floor(timeDiff / (1000 * 3600 * 24));

        // Calculate months and remaining days
        let months = 0;
        let tempDate = new Date(today);
        while (tempDate < targetDate) {
            months++;
            tempDate.setMonth(tempDate.getMonth() + 1);
        }
        months--; // Adjust because we went one month too far
        tempDate.setMonth(tempDate.getMonth() - 1);
        const remainingDaysAfterMonths = Math.floor((targetDate - tempDate) / (1000 * 3600 * 24));

        // Calculate weeks and remaining days
        const weeks = Math.floor(totalDays / 7);
        const remainingDaysAfterWeeks = totalDays % 7;

        resultDiv.innerHTML = `
            <p class="result"><strong>Months</strong><br> ${months} month${months !== 1 ? 's' : ''} & ${remainingDaysAfterMonths} day${remainingDaysAfterMonths !== 1 ? 's' : ''}</p>
            <p class="result"><strong>Weeks</strong><br> ${weeks} week${weeks !== 1 ? 's' : ''} & ${remainingDaysAfterWeeks} day${remainingDaysAfterWeeks !== 1 ? 's' : ''}</p>
            <p class="result"><strong>Days</strong><br> ${totalDays} day${totalDays !== 1 ? 's' : ''}</p>
        `;
    }

    function showToast(message) {
        toast.textContent = message;
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }

    // Event listener for the Calculate button
    calculateBtn.addEventListener('click', calculateCountdown);

    // Event listener for the Enter key
    targetDateInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default form submission
            calculateCountdown();
        }
    });
});