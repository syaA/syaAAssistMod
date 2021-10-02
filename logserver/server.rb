#! /usr/bin/env ruby
# encoding: utf-8

require "webrick"
require "yaml"
require "json"
require "erb"
require_relative "./cookie_clicker_logger"


LOG_DIR = './log'

config = YAML.load_file('config.yaml')

# ファイル名に使えない文字を変換
def rename_for_filename(s)
  s.gsub(/\\\/\:\*\?\"\<\>\|/, '_')
end

# ログのファイル名.
def log_filename(json)
  # 名前 + seed としておく.
  name = rename_for_filename(json['bakeryName'])+ '(' + json['seed'] + ')'
  File.join(LOG_DIR, name)
end

# ログ開く.
def log_open(json)
  $logger = CookieClickerLogger.new(log_filename(json))
end

# JSON を受け取る RPC.
class JsonRPCServlet < WEBrick::HTTPServlet::AbstractServlet
  def initialize(server, method, proc)
    super(server, proc);
    @method = method
    @proc = proc
  end
  #GET送信に対する処理を定義.
  def do_GET(req, res)
    if @method != 'GET'
      res.status = 405 # MethodNot Allowed
      return
    end
    resp = @proc.call(req)

    res.status = 200
    res['Content-Length'] = resp.bytesize
    res['Content-Type']   = "text/json; charset=utf-8"
    res.body = resp
  end
  #POST送信に対する処理を定義
  def do_POST(req, res)
    if @method != 'POST'
      res.status = 405 # MethodNot Allowed
      return
    end
    hash = JSON.parse(req.body);
    resp = @proc.call(hash)

    res.status = 200
    res['Content-Length'] = resp.bytesize
    res['Content-Type']   = "text/json; charset=utf-8"
    res.body = resp
  end
end

# 連続ログ追加.
def rpc_log_cont(json)
  if $logger.nil? || (log_filename(json) != $logger.base_filename)
    log_open(json)
  end
  $logger.log_cont_data(json)
  return ''
end

# イベントログ追加.
def rpc_log_event(json)
  if $logger.nil? || (log_filename(json) != $logger.base_filename)
    log_open(json)
  end
  $logger.log_event(json)
  return ''
end

# ログ数取得.
def rpc_get_log_list(req)
  return JSON.dump( {
    'logs' => Dir.glob(File.join(LOG_DIR, '*.cont.log')).map { |f| File.basename(f, '.cont.log') },
    'current' => $logger ? $logger.base_filename : ''
  } );
end

# ログのデータ取得.
def rpc_get_log_data(req)
  if $logger.nil? || (req.query['logname'] != $logger.base_filename)
    logger = CookieClickerLogger.new(File.join(LOG_DIR, req.query['logname']))
  else
    logger = $logger
  end

  event_data = logger.get_event_data()
  cont_data = logger.get_cont_data()

  last_tick = [cont_data['tick'][-1], event_data['lastTick']].max()
  labels = (last_tick / 30 / 60 + 0.5).to_i.times.map { |i| (i % 10 == 0) ? "#{i}" : "" }
  cookiesEarned = [{ 'x' => 0, 'y' => 0 }] + cont_data['tick'].zip(cont_data['cookiesEarned']).map { |t, c|
    { 'x' => t / 30 / 60, 'y' => c }
  }
  cookiesPsRaw = [{ 'x' => 0, 'y' => 0 }] + event_data['cookiesPsRaw'].map {|t, cps|
    { 'x' => t / 30 / 60, 'y' => cps }
  } + [{ 'x' => last_tick / 30 / 60, 'y' => event_data['cookiesPsRaw'][-1][1] }]
  objectsAmount = event_data['objectsAmount'].map { |objectAmount|
    [{ 'x' => 0, 'y' => 0 }] + objectAmount.map { |t, num|
      { 'x' => t / 30 / 60, 'y' => num }
    } + [{ 'x' => last_tick / 30 / 60, 'y' => objectAmount[-1][1] }]
  }
  objectsCps = event_data['objectsCps'].map { |objectCps|
    [{ 'x' => 0, 'y' => 0 }] + objectCps.map { |t, cps|
      { 'x' => t / 30 / 60, 'y' => cps }
    } + [{ 'x' => last_tick / 30 / 60, 'y' => objectCps[-1][1] }]
  }


  return JSON.dump({
    'labels' => labels,
    'cookiesEarned' => cookiesEarned,
    'cookiesPsRaw' => cookiesPsRaw,
    'objectsAmount' => objectsAmount,
    'objectsCps' => objectsCps,
  });
end

# サーバ開始.
#WEBrick::HTTPServlet::FileHandler.add_handler('erb', WEBrick::HTTPServlet::ERBHandler)
httpserver = WEBrick::HTTPServer.new(
  { :DocumentRoot => './',
    :BindAddress => '127.0.0.1',
    :Port => 28080})
# RPC 関連.
httpserver.mount("/log_cont", JsonRPCServlet, 'POST', method(:rpc_log_cont))
httpserver.mount("/log_event", JsonRPCServlet, 'POST', method(:rpc_log_event))
httpserver.mount("/get_log_list", JsonRPCServlet, 'GET', method(:rpc_get_log_list))
httpserver.mount("/get_log_data", JsonRPCServlet, 'GET', method(:rpc_get_log_data))
httpserver.mount('/', WEBrick::HTTPServlet::FileHandler, 'contents/')
httpserver.mount('/view_log.js', WEBrick::HTTPServlet::FileHandler, 'contents/view_log.js')

trap('INT') {
  httpserver.shutdown
=begin
  config = Hash.new
  # 最後のログファイル名を保存しておく.
  config['current'] = $logger_filename
  File.open('config.yaml', 'w') { |f|
    YAML.dump(config, f);
  }
=end
}
httpserver.start

