  const chartVisaoGeralEl = document.getElementById('chartVisaoGeral');
  const chartStatusDonutEl = document.getElementById('chartStatusDonut');
  const chartExpiraEl = document.getElementById('chartExpira');

  if (window.Chart) {
    const gridColor = 'rgba(148,163,184,.2)';
    const labelColor = '#64748b';
    const defaultLabels = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const defaultData = [12, 18, 30, 45, 38, 25, 32, 40, 48];
    const lineLabels = (LOJAS_CHART.labelsMes.length ? LOJAS_CHART.labelsMes : defaultLabels);
    const lineData = (LOJAS_CHART.totaisMes.length ? LOJAS_CHART.totaisMes : defaultData);

    if (chartVisaoGeralEl) {
      const destaqueQtd = 3;
      const barColors = lineLabels.map((_, i) => (i >= lineLabels.length - destaqueQtd ? '#405189' : '#e2e8f0'));
      new Chart(chartVisaoGeralEl.getContext('2d'), {
        type: 'bar',
        data: {
          labels: lineLabels,
          datasets: [{
            label: 'Novas lojas',
            data: lineData,
            backgroundColor: barColors,
            borderRadius: 6,
            maxBarThickness: 28
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: labelColor } },
            y: { grid: { color: gridColor }, ticks: { precision: 0, color: labelColor }, beginAtZero: true }
          }
        }
      });
    }

    if (chartStatusDonutEl) {
      new Chart(chartStatusDonutEl.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Ativas', 'Em teste', 'Expiradas', 'Outras'],
          datasets: [{
            data: [LOJAS_CHART.totalAtivas, LOJAS_CHART.totalTrial, LOJAS_CHART.expiradas, LOJAS_CHART.totalOutras],
            backgroundColor: ['#0ab39c', '#f1963a', '#e63770', '#cbd5e1'],
            borderWidth: 0
          }]
        },
        options: {
          cutout: '72%',
          plugins: { legend: { display: false } }
        }
      });
    }

    if (chartExpiraEl) {
      new Chart(chartExpiraEl.getContext('2d'), {
        type: 'bar',
        data: {
          labels: ['7 dias', '15 dias', '30 dias', 'Expiradas'],
          datasets: [{
            data: [LOJAS_CHART.expira7, LOJAS_CHART.expira15, LOJAS_CHART.expira30, LOJAS_CHART.expiradas],
            backgroundColor: ['#22c55e', '#86efac', '#bbf7d0', '#fecaca'],
            borderRadius: 8,
            barThickness: 18
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: labelColor } },
            y: { grid: { color: gridColor }, ticks: { precision: 0, color: labelColor }, beginAtZero: true }
          }
        }
      });
    }
  }
