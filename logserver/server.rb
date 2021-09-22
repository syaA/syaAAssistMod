#! /usr/bin/env ruby
# encoding: utf-8

require "webrick"
require "yaml"
require "logger"
require "json"

def new_log_filename()
  Time.now.strftime('log/%Y%m%d%H%M%S.log')
end

config = YAML.load_file('config.yaml')
$log_filename = config['current']
if $log_filename.nil?
  $log_filename = new_log_filename()
end

$logger = Logger.new($log_filename)

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
  $logger.info("#{json['cookies']},#{json['cookiesPsRaw']},#{json['cookiesEarned']},#{json['objectsAmount'].join(',')}");
  return ''
end

# リセット.
def rpc_reset(json)
  $log_filename = new_log_filename()
  $logger = Logger.new($log_filename)
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
  config['current'] = $log_filename
  File.open('config.yaml', 'w') { |f|
    YAML.dump(config, f);
  }
}
httpserver.start

