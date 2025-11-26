
const fs = require('fs');

const states = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
    "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
    "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
    "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
    "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

const statuses = ["Single", "Married", "Head_of_Household", "Separate"];

let csvContent = "ID,Region,State,Parent Region,TaxType,TaxedIncome,Filing Status,Range,RangeValue,Ladder Step,Rate\n";

states.forEach(state => {
    statuses.forEach(status => {
        // Example: 3 brackets per state as a placeholder
        for (let i = 1; i <= 3; i++) {
            const id = `State_Province_${state}_Income_${status}_Bot_Range_Ladder Step${i}`;
            // Placeholder values: 0, 50000, 100000
            const rangeValue = (i - 1) * 50000;
            // Placeholder rate: 0.01 * i
            const rate = (0.01 * i).toFixed(2);

            csvContent += `${id},State_Province,${state},USA,Income,Income,${status},Bot_Range,${rangeValue},${i},${rate}\n`;

            // Add Top_Range row (required by current format, though often redundant if inferred)
            // For simplicity, let's just add Bot_Range as that's the primary driver, 
            // but the existing file has Top_Range too.
            // Let's add Top_Range to be consistent.
            const topId = `State_Province_${state}_Income_${status}_Top_Range_Ladder Step${i}`;
            const topRangeValue = i * 50000; // Just a guess
            csvContent += `${topId},State_Province,${state},USA,Income,Income,${status},Top_Range,${topRangeValue},${i},${rate}\n`;
        }
    });
});

console.log(csvContent);
