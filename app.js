document.addEventListener('DOMContentLoaded', async () => {
    console.log('Chart.js version:', Chart.version);

    const sensorsList = document.getElementById('sensorsList');
    const sensorDetails = document.getElementById('sensorDetails');
    const timeRangeForm = document.getElementById('timeRangeForm');
    const fetchDataButton = document.getElementById('fetchDataButton');
    let startTime = null;
    let endTime = null;
    let nicknames = {};
    let intervalId;

    timeRangeForm.addEventListener('submit', (event) => {
        event.preventDefault();
        startTime = document.getElementById('startTime').value ? new Date(document.getElementById('startTime').value).toISOString() : null;
        endTime = document.getElementById('endTime').value ? new Date(document.getElementById('endTime').value).toISOString() : null;
        fetchSensorData();
    });

    async function fetchSensors() {
        try {
            const sensorsResponse = await fetch('http://<your-server-ip>:3000/sensors');
            if (!sensorsResponse.ok) {
                throw new Error('Failed to fetch sensors');
            }
            const sensors = await sensorsResponse.json();
            sensorsList.innerHTML = '';
            sensors.forEach((sensorId, index) => {
                const option = document.createElement('option');
                option.value = sensorId;
                option.textContent = `Sensor${index + 1} (${sensorId})`;
                sensorsList.appendChild(option);
                nicknames[sensorId] = `Sensor${index + 1}`;
            });
        } catch (error) {
            console.error('Error fetching sensors:', error);
        }
    }

    fetchSensors();
    intervalId = setInterval(fetchSensors, 60000);

    fetchDataButton.addEventListener('click', fetchSensorData);

    async function fetchSensorData() {
        const selectedSensors = Array.from(sensorsList.selectedOptions).map(option => option.value);
        if (selectedSensors.length === 0) {
            alert('Please select at least one sensor.');
            return;
        }

        try {
            const allData = [];
            for (const sensorId of selectedSensors) {
                await fetchSensorDetails(sensorId);
            }

            if (allData.length > 0) {
                const tableHtml = generateTableHtml(allData);
                sensorDetails.innerHTML = tableHtml;
                console.log('Filtered Data for Chart:', allData);
                renderChart(allData);
            }

            async function fetchSensorDetails(sensorId) {
                const url = new URL(`http://<your-server-ip>:3000/sensor-data/${sensorId}`);
                if (startTime && endTime) {
                    url.searchParams.append('start', startTime);
                    url.searchParams.append('end', endTime);
                }
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error('Failed to fetch sensor data');
                }
                const data = await response.json();

                const filteredData = data.map(item => ({
                    _time: item._time,
                    original_hex: item.original_hex,
                    presence: item.presence !== undefined ? item.presence : 1,
                    nickname: nicknames[sensorId]
                }));

                allData.push(...filteredData);
            }
        } catch (error) {
            console.error('Error fetching sensor details:', error);
        }
    }

    function generateTableHtml(data) {
        if (data.length === 0) return '<p>No data available for these sensors.</p>';

        const headers = ['_time', 'original_hex', 'nickname'];
        const rows = data.map(row => {
            return `<tr>${headers.map(header => `<td>${row[header]}</td>`).join('')}</tr>`;
        }).join('');

        return `
            <table>
                <thead>
                    <tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    function renderChart(data) {
        const ctx = document.getElementById('chart').getContext('2d');
        if (window.myChart) {
            window.myChart.destroy();
        }

        const datasets = [];
        const groupedData = data.reduce((acc, item) => {
            if (!acc[item.nickname]) {
                acc[item.nickname] = [];
            }
            acc[item.nickname].push({
                x: new Date(item._time),
                y: item.presence
            });
            return acc;
        }, {});

        for (const [nickname, values] of Object.entries(groupedData)) {
            datasets.push({
                label: nickname,
                data: values,
                borderColor: getRandomColor(),
                backgroundColor: getRandomColor(),
                showLine: false,
                pointRadius: 5
            });
        }

        console.log('Chart Datasets:', datasets);

        window.myChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: datasets
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'dd.MM.yyyy HH:mm:ss',
                            displayFormats: {
                                millisecond: 'dd.MM.yyyy HH:mm:ss.SSS',
                                second: 'dd.MM.yyyy HH:mm:ss',
                                minute: 'dd.MM.yyyy HH:mm',
                                hour: 'dd.MM.yyyy HH',
                                day: 'dd.MM.yyyy',
                                week: 'dd.MM.yyyy',
                                month: 'MM.yyyy',
                                quarter: 'QQQ yyyy',
                                year: 'yyyy'
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)',
                                lineWidth: 3
                            },
                            ticks: {
                                color: '#000',
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Presence'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            lineWidth: 3
                        },
                        ticks: {
                            color: '#000',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
    }

    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    setInterval(fetchSensorData, 60000);
});
