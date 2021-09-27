﻿// 色の系列.
const LineColor = [ '#4285f4','#ea4335','#fbbc04','#34a853','#ff6d01','#46bdc6','#7baaf7','#f07b72','#fcd04f','#71c287','#ff994d','#7ed1d7','#b3cefb','#f7b4ae']
const ObjectName = [
  'Cursor', 'Grandma', 'Farm', 'Mine', 'Factory', 'Bank', 'Temple', 'Wizard tower', 'Shipment', 'Alchemy lab', 'Portal', 'Time machine',
  'Antimatter condenser', 'Prism', 'Chancemaker', 'Fractal engine', 'Javascript console', 'Idleverse'
];


$(document).ready(function(){
  // ログのリストを取得.
  $.getJSON('http://127.0.0.1:28080/get_log_list', function(data) {
    data.logs.forEach(function(log) {
      $('<option>', { value: log,
                      text: log,
                      seleted: log == data.current }
        ).appendTo($('#select-log'));
    });
    // 最初のグラフ作成.
    $.getJSON('http://127.0.0.1:28080/get_log_data', { logname: data.current }, function(data) {
      createChart(data)
    });
  });

  let chartCookie = null;
  let chartObjectAmount = null;

  // グラフ更新.
  createChart = function(log) {
    // すでにあれば破棄.
    if (chartCookie) {
      chartCookie.destroy();
    }
    if (chartObjectAmount) {
     chartObjectAmount.destroy();
    }
    // CPS/クッキー作成数 グラフ.
    chartCookie = new Chart($('#cookie-chart-canvas'), {
      type: 'line',
      data: {
        labels: log.labels,
        datasets: [
          {
            label: 'CPS',
            data: log.cookiesPsRaw,
            borderColor: LineColor[0],
            pointRadius: 0,
            yAxisID: 'y_cps',
          },
          {
            label: 'Cookie',
            data: log.cookiesEarned,
            borderColor: LineColor[1],
            pointRadius: 0,
            yAxisID: 'y_cookie',
          },
        ],
      },
      options: {
        title: { display: true, text: 'クッキー' },
        plugins: { 
          legend: { position: 'right' },
        },
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y_cps: {
            //type: 'logarithmic',
            position: 'left',
          },
          y_cookie: {
            position: 'right',
            grid: {
              drawOnChartArea: false, // only want the grid lines for one axis to show up
            },
          },
        }
      },
    });

    // Object数グラフ.
    chartObjectAmount = new Chart($('#object-chart-canvas'), {
      type: 'line',
      data: {
        labels: log.labels,
        datasets: log.objectsAmount.map(function(objectName, i) {
          return {
            label: ObjectName[i],
            data: log.objectsAmount[i],
            borderColor: LineColor[i],
            pointRadius: 0,
          }
        }),
      },
      options: {
        title: { display: true, text: 'オブジェクト数' },
        plugins: { 
          legend: { position: 'right' },
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }

  // ログが選ばれたらグラフを更新.
  $('#select-log').on('change', function(event) {
    $.getJSON('http://127.0.0.1:28080/get_log_data', { logname: event.target.value }, function(data) {
      createChart(data)
    });
  });
  
});
