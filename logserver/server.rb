#! /usr/bin/env ruby
# encoding: utf-8

require "webrick"
require "yaml"
require "logger"
require "json"
require "erb"


LOG_DIR = './log'


config = YAML.load_file('config.yaml')
$logger_filename = config['current']
$logger = nil
unless $logger_filename.nil?
  $logger = Logger.new($logger_filename)
end

# ファイル名に使えない文字を変換
def rename_for_filename(s)
  s.gsub(/\\\/\:\*\?\"\<\>\|/, '_')
end

# ログのファイル名.
def log_filename(json)
  # 名前 + seed としておく.
  name = rename_for_filename(json['bakeryName'])+ '_' + json['seed'] + '.log'
  File.join(LOG_DIR, name)
end

# ログ開く.
def log_open(name)
  $logger_filename = name
  $logger = Logger.new($logger_filename)
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

# ログ追加.
def rpc_append_log(json)
  name = log_filename(json)
  unless $logger_filename == name
    log_open(name)
  end
  s = "#{json['fps']},#{json['cookies']},#{json['cookiesPsRaw']},#{json['cookiesEarned']},#{json['objectsAmount'].join(',')}"
  $logger.info(s)
  return s
end

# リセット.
def rpc_reset(json)
  return ''
end

# ログ数取得.
def rpc_get_log_list(req)
  return JSON.dump( {
    'logs' => Dir.glob(File.join(LOG_DIR, '*.log')).map { |f| File.basename(f, '.log') },
    'current' => File.basename($logger_filename, '.log')
  } );
end

# ログのデータ取得.
def rpc_get_log_data(req)
  target = File.join(LOG_DIR, req.query['logname'] + '.log')

  data = Array.new
  File.open(target, 'r') { |f|
    f.each { |l|
      if l =~ /INFO -- : /
        data << $'.split(',').map(&:to_f)
      end
    }
  }

  labels = data.size.times.map { |i| (i % 10 == 0) ? "#{i}" : "" }
  cookiesEarned = data.map{|l| l[3]}
  cookiesPsRaw = data.map{|l| l[2]}
  # オブジェクトはある分だけ.
  last = data[-1].size - data[-1].reverse_each.find_index { |n| n != 0 }
  objectsAmount = Array.new(last - 4, Array.new);
  objectsAmount.size.times { |i|
    objectsAmount[i] = data.map { |l| l[4 + i] }
  }

  return JSON.dump( {
    'labels' => labels,
    'cookiesEarned' => cookiesEarned,
    'cookiesPsRaw' => cookiesPsRaw,
    'objectsAmount' => objectsAmount
  });
end

# サーバ開始.
#WEBrick::HTTPServlet::FileHandler.add_handler('erb', WEBrick::HTTPServlet::ERBHandler)
httpserver = WEBrick::HTTPServer.new(
  { :DocumentRoot => './',
    :BindAddress => '127.0.0.1',
    :Port => 28080})
# RPC 関連.
httpserver.mount("/append_log", JsonRPCServlet, 'POST', method(:rpc_append_log))
httpserver.mount("/reset", JsonRPCServlet, 'POST', method(:rpc_reset))
httpserver.mount("/get_log_list", JsonRPCServlet, 'GET', method(:rpc_get_log_list))
httpserver.mount("/get_log_data", JsonRPCServlet, 'GET', method(:rpc_get_log_data))
httpserver.mount('/', WEBrick::HTTPServlet::FileHandler, 'contents/')
httpserver.mount('/view_log.js', WEBrick::HTTPServlet::FileHandler, 'contents/view_log.js')

trap('INT') {
  httpserver.shutdown
  config = Hash.new
  # 最後のログファイル名を保存しておく.
  config['current'] = $logger_filename
  File.open('config.yaml', 'w') { |f|
    YAML.dump(config, f);
  }
}
httpserver.start

