
# クッキークリッカーログ.
# イベントログ
#   ・オブジェクト/アップグレード購入
#   ・実績取得
#   ・ゴールデンクッキー.
# 連続ログ
#   ・cookiesEarned
class CookieClickerLogger

  Event_Object = 1
  Event_Upgrade = 2
  Event_Achivement = 3
  Event_GoldenCookie = 4
  Event_Reincarnate = 5
  
  def initialize(base_filename)
    @base_filename = base_filename
    @event_log_filename = base_filename + '.event.log'
    @event_log_file = open(@event_log_filename, 'ab')
    @cont_log_filename = base_filename + '.cont.log'
    @cont_log_file = open(@cont_log_filename, 'ab')
  end

  def base_filename
    @base_filename
  end

  # イベントデータ記録.
  def log_event(data)
    case data['type']
    when 'Object'
      type = Event_Object
    when 'Upgrade'
      type = Event_Upgrade
    when 'Achivement'
      type = Event_Achivement
    when 'GoldenCookie'
      type = Event_GoldenCookie
    when 'Reincarnate'
      type = Event_Reincarnate
    end
    log_data = [
      data['T'], 
      type,
      data['id'],
      data['i0'],
      data['i1'],
      data['d0'],
      data['d1'],
      data['cookiesPsRaw'],
    ]
    @event_log_file << log_data.pack('dnnnndddx24') # 64byte
    @event_log_file.flush
  end

  # イベントデータ取得.
  def get_event_data()
    ret = { 'cookiesPsRaw' => [],
            'objectsAmount' => [],
            'objectsCps' => [],
            'upgrade' => [],
            'achievement' => [],
            'goldenCookie' => []
          }
    File.open(@event_log_filename, 'rb') { |f|
      while true
        s = f.read(64)
        break if s.nil?
        tick, type, id, i0, i1, d0, d1, cps = s.unpack('dnnnndddx24')
        case type
          when Event_Object
            unless ret['objectsAmount'][id]
              ret['objectsAmount'][id] = Array.new
            end
            ret['objectsAmount'][id] << [tick, i0]
            unless ret['objectsCps'][id]
              ret['objectsCps'][id] = Array.new
            end
            ret['objectsCps'][id] << [tick, d0]
            ret['cookiesPsRaw'] << [tick, cps]
          when Event_Upgrade
            ret['upgrade'] << [tick, id, i0, i1]
            ret['cookiesPsRaw'] << [tick, cps]
          when Event_Achivement
            ret['achievement'] << [tick, id]
            ret['cookiesPsRaw'] << [tick, cps]
          when Event_GoldenCookie
            ret['goldenCookie'] << [tick, id]
            ret['cookiesPsRaw'] << [tick, cps]
          when Event_Reincarnate
            ret['cookiesPsRaw'] << [tick, cps]
        end
      end
    }
    ret
  end

  # 連続ログ記録.
  def log_cont_data(data)
    @cont_log_file << [data['T'], data['fps'], data['cookiesEarned'], data['cookies']].pack('d*')
    @cont_log_file.flush
  end

  # 連続ログ取得. [fps, cookiesEarned, cookies]
  def get_cont_data
    ret = { 'tick' => [], 'fps' => [], 'cookiesEarned' => [], 'cookies' => [] }
    File.open(@cont_log_filename, 'rb') { |f|
      f.read.unpack('d*').each_slice(4).reduce(ret) { |r, x|
        r['tick'] << x[0]
        r['fps'] << x[1]
        r['cookiesEarned'] << x[2]
        r['cookies'] << x[3]
        r
      }
    }
    ret
  end

end

