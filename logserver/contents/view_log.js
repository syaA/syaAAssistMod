// 色の系列.
const LineColor = [
  '#4285f4','#ea4335','#fbbc04','#34a853','#ff6d01','#46bdc6',
  '#7baaf7','#f07b72','#fcd04f','#71c287','#ff994d','#7ed1d7',
  '#b3cefb','#f7b4ae','#fde49b','#aedcba','#ffc599','#b5e5e8',
  '#ecf3fe','#fdeceb','#fff8e6','#ebf6ee']
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
    $.getJSON('http://127.0.0.1:28080/get_log_data', { logname: $('#select-log')[0].value }, function(data) {
      createChart(data)
    });

    // リロードボタン.
    $('#button-reload').bind('click', function() {
      $.getJSON('http://127.0.0.1:28080/get_log_data', { logname: $('#select-log')[0].value }, function(data) {
        createChart(data)
      });
    });
  });

  let chartCookie = null;
  let chartObjectAmount = null;
  let chartObjectCps = null;

  const zoomOptions = {
    zoom: {
      wheel: { enabled: true, },
      pinch: { enabled: true, },
      mode: 'xy',
    },
    pan: {
      enabled: true,
      mode: 'xy',
    },
    limits: {
      x: {min: 0, minRange: 10},
      y: {min: 0, minRange: 10}
    },
  };

  // ズーム.
  zoomChart = function() {
    let minTick = $('#slider-chart-min').val();
    let maxTick = $('#slider-chart-max').val();

    chartCookie.zoomScale('x', {min: minTick, max: maxTick}, 'default');
    chartObjectAmount.zoomScale('x', {min: minTick, max: maxTick}, 'default');
    chartObjectCps.zoomScale('x', {min: minTick, max: maxTick}, 'default');
  }
  
  // グラフ更新.
  createChart = function(log) {
    // すでにあれば破棄.
    if (chartCookie) {
      chartCookie.destroy();
    }
    if (chartObjectAmount) {
     chartObjectAmount.destroy();
    }
    if (chartObjectCps) {
     chartObjectCps.destroy();
    }

    // Zoom 範囲スライダー.
    $('#slider-chart-min').prop('min', 0);
    $('#slider-chart-min').prop('max', log.lastTick);
    $('#slider-chart-min').val(0);
    $('#slider-chart-min').on('input', function() {
      $('#number-chart-min').val($(this).val());
    });
    $('#slider-chart-min').on('change', function() {
      zoomChart();
    });
    $('#number-chart-min').prop('min', 0);
    $('#number-chart-min').prop('max', log.lastTick);
    $('#number-chart-min').val(0);
    $('#number-chart-min').on('input', function() {
      $('#slider-chart-min').val($(this).val());
    });
    $('#number-chart-min').on('change', function() {
      zoomChart();
    });

    $('#slider-chart-max').prop('min', 0);
    $('#slider-chart-max').prop('max', log.lastTick);
    $('#slider-chart-max').val(log.lastTick);
    $('#slider-chart-max').on('input', function() {
      $('#number-chart-max').val($(this).val());
    });
    $('#slider-chart-max').on('change', function() {
      zoomChart();
    });
    $('#number-chart-max').prop('min', 0);
    $('#number-chart-max').prop('max', log.lastTick);
    $('#number-chart-max').val(log.lastTick);
    $('#number-chart-max').on('input', function() {
      $('#slider-chart-max').val($(this).val());
    });
    $('#number-chart-max').on('change', function() {
      zoomChart();
    });

    // Zoom リセットボタン.
    $('#button-chart-reset').on('click', function() {
      chartCookie.resetZoom();
      chartObjectAmount.resetZoom();
      chartObjectCps.resetZoom();

      $('#slider-chart-min').val(0);
      $('#number-chart-min').val(0);
      $('#slider-chart-max').val(log.lastTick);
      $('#number-chart-max').val(log.lastTick);

      zoomChart();
    });



    // CPS/クッキー作成数 グラフ.
    chartCookie = new Chart($('#cookie-chart-canvas'), {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Cookie',
            data: log.cookiesEarned,
            borderColor: LineColor[1],
            showLine: true,
//            pointRadius: 0,
            yAxisID: 'y_cookie',
          },
          {
            label: 'CPS',
            data: log.cookiesPsRaw,
            showLine: true,
            pointRadius: 0,
            stepped: 'before',
            borderColor: LineColor[0],
            yAxisID: 'y_cps',
          },
        ],
      },
      options: {
        plugins: { 
          title: { display: true, text: 'クッキー' },
          legend: { position: 'right' },
          zoom: zoomOptions
        },
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y_cps: {
            position: 'left',
            grid: {
              drawOnChartArea: false, // only want the grid lines for one axis to show up
            },
          },
          y_cookie: {
            position: 'right',
//            type: 'logarithmic',
          },
        }
      },
    });

    // Object数グラフ.
    chartObjectAmount = new Chart($('#object-chart-canvas'), {
      type: 'scatter',
      data: {
        datasets: log.objectsAmount.map(function(objectName, i) {
          return {
            label: ObjectName[i],
            data: log.objectsAmount[i],
            borderColor: LineColor[i],
            pointRadius: 0,
            showLine: true,
            stepped: 'before',
          }
        }),
      },
      options: {
        plugins: { 
          title: { display: true, text: 'オブジェクト数' },
          legend: { position: 'right' },
          zoom: zoomOptions
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    // Object CPSグラフ.
    chartObjectCps = new Chart($('#object-cps-chart-canvas'), {
      type: 'scatter',
      data: {
        datasets: log.objectsCps.map(function(objectName, i) {
          return {
            label: ObjectName[i],
            data: log.objectsCps[i],
            borderColor: LineColor[i],
            pointRadius: 0,
            showLine: true,
            stepped: 'before',
          }
        }),
      },
      options: {
        plugins: { 
          title: { display: true, text: 'オブジェクト CPS' },
          legend: { position: 'right' },
          zoom: zoomOptions
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

