#! /usr/bin/env ruby
# encoding: utf-8

require "webrick"
require "yaml"
require "logger"
require "json"


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
  def initialize(server, proc)
    super(server, proc);
    @proc = proc
  end
  #POST送信に対する処理を定義
  def do_POST(req, res)
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

# サーバ開始.
httpserver = WEBrick::HTTPServer.new(
  { :DocumentRoot => './',
    :BindAddress => '127.0.0.1',
    :Port => 28080})
httpserver.mount("/append_log", JsonRPCServlet, method(:rpc_append_log))
httpserver.mount("/reset", JsonRPCServlet, method(:rpc_reset))

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

