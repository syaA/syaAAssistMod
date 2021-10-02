Game.registerMod("syaa_assist_mod",{
	init:function(){
		//this function is called as soon as the mod is registered
		//declare hooks here
		
		//writing mods for Cookie Clicker may require a decent understanding of javascript.
		//dig around in the game files and look for "main.js", almost the entire source code is in there including further mod hook instructions and more examples! search for "MODDING API".

		// ロード時メッセージ
		Game.Notify(`syaA AutoClicker MOD loaded!`,`Now with Auto clicker!`,[16,5]);

		//we declare "MOD" as a proxy for "this", since inside other functions and events "this" no longer refers to this mod but to the functions or events themselves!
		let MOD=this;
		
		// ================================================================================
		// オプション.
		// ================================================================================
		MOD.prefs=[];
		MOD.prefs.menu = 0;
		MOD.prefs.bigClick = 1;	// 自動クリックするか？
		MOD.prefs.bigClickInterval = 30 / 10;	// 自動クリック間隔(フレーム).
		MOD.prefs.goldenClick = 1;	// ゴールデンクッキー等を自動クリックするか？
		MOD.prefs.goldenCheckInterval = 30 * 1;	// ゴールデンクッキーのチェック間隔(フレーム)
		MOD.prefs.buyObject = 1;	// オブジェクト自動購入するか？
		MOD.prefs.buyUpgrade = 1;	// アップグレード自動購入するか？
		MOD.prefs.buyCheckInterval = 30 * 1; // 自動購入のチェック間隔(フレーム).
		MOD.prefs.dispInfo = 1;	// 行動順位など表示.
		MOD.prefs.sendLogInterval = 60 * 30; // ログ送信間隔(フレーム).
		MOD.keepTick;	// 通しティック.
		MOD.ready = 0;
		MOD.showMenu = 0;

		// ================================================================================
		// UI
		// ================================================================================
		// オプション切り替え.
		MOD.togglePref = function(name, button, on, off) {
			if (MOD.prefs[name]) {
				l(button).innerHTML = off;
				MOD.prefs[name] = 0;
			} else {
				l(button).innerHTML = on;
				MOD.prefs[name] = 1;
			}
			l(button).className='smallFancyButton option'+((MOD.prefs[name])?'':' off');
		}
		// オプションボタン.
		MOD.createButton = function(prefName, buttonId, onStr, offStr, func) {
			let elem = document.createElement('a');
			elem.className = 'smallFancyButton option'+(MOD.prefs[prefName] ? '' : ' off');
			elem.id = buttonId;
			elem.innerHTML = MOD.prefs[prefName] ? onStr : offStr;
			elem.onclick = function() {
				MOD.togglePref(prefName, buttonId, onStr, offStr);
				if (func) {
					func(MOD.prefs[prefName]);
				}
				PlaySound('snd/tick.mp3');
			}
			return elem;
		}
		// メニューボタン.
		l('storeTitle').append(MOD.createButton('menu', 'menuButton', 'Assist', 'Assist'));
		l('menuButton').after(MOD.createButton('bigClick', 'bigClickButton', 'BigClick ON', 'BigClick OFF'));
		l('bigClickButton').style.display = "none"
		l('menuButton').after(MOD.createButton('goldenClick', 'goldenClickButton', 'GoldClick ON', 'GoldClick OFF'));
		l('goldenClickButton').style.display = "none"
		l('menuButton').after(MOD.createButton('buyObject', 'buyObjectButton', 'BuyObject ON', 'BuyObject OFF'));
		l('buyObjectButton').style.display = "none"
		l('menuButton').after(MOD.createButton('buyUpgrade', 'buyUpgradeButton', 'BuyUpgrade ON', 'BuyUpgrade OFF'));
		l('buyUpgradeButton').style.display = "none"
		l('menuButton').after(MOD.createButton('dispInfo', 'dispInfoButton', 'DispInfo ON', 'Disp OFF', function(sw) {
			let vis = sw ? '' : 'none'
			for (let i=0; i<20; ++i) {
				let rankDiv = l('product' + i + 'saStatus');
				if (rankDiv) {
					rankDiv.style.display = vis;
				}
			}
			for (let i=0; i<128; ++i) {
				let rankDiv = l('upgrade' + i + 'saStatus');
				if (rankDiv) {
					rankDiv.style.display = vis;
				}
			}
		}));
		l('dispInfoButton').style.display = "none"

		// メニュー開く.
		AddEvent(l('menuButton'), 'click', function(){
			MOD.showMenu = 1 - MOD.showMenu;
			if (MOD.showMenu) {
				l('bigClickButton').style.display = "block"
				l('goldenClickButton').style.display = "block"
				l('buyObjectButton').style.display = "block"
				l('buyUpgradeButton').style.display = "block"
				l('dispInfoButton').style.display = "block"
			} else {
				l('bigClickButton').style.display = "none"
				l('goldenClickButton').style.display = "none"
				l('buyObjectButton').style.display = "none"
				l('buyUpgradeButton').style.display = "none"
				l('dispInfoButton').style.display = "none"
			}
		});

		// ================================================================================
		// クッキークリック.
		// ================================================================================
		MOD.sendClickEvent = function(elem) {
			if (!elem) {
				return;
			}
			let rect = elem.getBoundingClientRect();
			let x = window.pageXOffset + rect.left + rect.width / 2;
			let y = window.pageYOffset + rect.top + rect.height / 2;
//			var e = document.createEvent('MouseEvent');
//			e.initMouseEvent('click', true, true, window, null, 0, 0, x, y, false, false, false, false, 0, null);
//			elem.dispatchEvent(e);
			// マウス位置を偽装...
			mx = Game.mouseX;
			my = Game.mouseY;
			Game.mouseX = (x)/Game.scale;
			Game.mouseY = (y-TopBarOffset)/Game.scale;
			elem.click();
			Game.mouseX = mx;
			Game.mouseY = my;
		}

		// クッキーを１クリック.
		MOD.clickBigCookie = function() {
			MOD.sendClickEvent(l('bigCookie'));
		}
		// ゴールデンクッキーを全てクリック.
		MOD.clickGoldenCookie = function() {
			let ss = l('shimmers');
			if (!ss) {
				return;
			}
			let n = ss.childNodes.length;
			for (let i=0; i<n; ++i) {
				MOD.sendClickEvent(ss.childNodes[i]);
				// ゴールデンクッキー.
				MOD.sendEventLog({ 'type' : 'GoldenCookie' });
			}
		}

		// ================================================================================
		// 購入.
		// ================================================================================
		// 更新タイミング.
		Game.registerHook('logic', function() {
			if (!Game.ready) {
				return;
			}
			if (!MOD.ready) {
				return;
			}

			let tick = MOD.keepTick + Game.T;
			if (!tick) {
				return;
			}

			// クッキークリック.
			if (MOD.prefs.bigClick && ((tick % MOD.prefs.bigClickInterval) == 0)) {
				MOD.clickBigCookie();
			}

			// ゴールドクッキークリック.
			if (MOD.prefs.goldenClick && ((tick % MOD.prefs.goldenCheckInterval) == 0)) {
				MOD.clickGoldenCookie();
			}

			// 購入.
			if (MOD.prefs.buyObject && ((tick % MOD.prefs.buyCheckInterval) == 0)) {
				let actions = MOD.think();
				if (actions.length > 0) {
					actions[0].exec();

					actions.forEach(function(act, index) {
						act.debugDrawRank(index + 1);
					});
				}
			}

			// ログ送信.
			if (((tick % MOD.prefs.sendLogInterval) == 0)) {
				MOD.sendContLog();
			}
		});


		// オブジェクト CPS.
		MOD.guessObjectCps = function(obj) {
			Game.CalculateGains();
			let cps = Game.cookiesPs;
			let clickCps = Game.computedMouseCps;

			obj.amount++;
			Game.CalculateGains();

			cpsInc = Math.max(Game.cookiesPs - cps, 0);
			clickCpsInc = Math.max(Game.computedMouseCps - clickCps, 0);
			
			obj.amount--;
			Game.CalculateGains();

			return cpsInc + clickCpsInc * 30 / MOD.prefs.bigClickInterval;
		}

		// オブジェクト購入行動.
		MOD.ActionBuyObject = function(it) {
			this.it = it;
			this.cps = MOD.guessObjectCps(it);
			this.price = it.getPrice(0);
			this.exec = function() {
				if (Game.cookies >= this.price) {
					it.buy(1);
					Game.CalculateGains();
					// ログ.
					MOD.sendEventLog({
						'type' : 'Object',
						'id' : it.id,
						'i0' : it.amount,
						'd0' : it.storedTotalCps,
					});
				}
			}
			this.debugDrawRank = function(rank) {
				let stateId = 'product' + it.id + 'saStatus';
				let stateDiv = l(stateId);
				if (!stateDiv) {
					stateDiv = document.createElement('div');
					stateDiv.id = stateId;
					l('productIcon' + it.id).appendChild(stateDiv);
				}
				let cpsRatio = this.cps / (Game.cookiesPs||1) * 100;
				let cookieRatio = Math.min(Game.cookies / this.price, 1) * 100;
				stateDiv.innerHTML = `
<div style="background-color:${(rank == 1) ? '#ff2020af' : '#602020af'};width:45px;">
  ${rank}
</div>
<div style="background:linear-gradient(to left, #307000af ${cpsRatio}%, #202020af ${cpsRatio}%);width:45px;text-align:right">
  +${(cpsRatio).toFixed(1)}%
</div>
<div style="background:linear-gradient(to left, #307000af ${cookieRatio}%, #202020af ${cookieRatio}%);width:45px;text-align:right">
  ${(cookieRatio).toFixed(1)}%
</div>
`
			}
		}

		// アップグレード CPS.
		MOD.guessUpgradeCps = function(me) {
			Game.CalculateGains();
			let cps = Game.cookiesPs;
			let clickCps = Game.computedMouseCps;

			
			me.bought = 1;
			Game.CalculateGains();

			cpsInc = Math.max(Game.cookiesPs - cps, 0);
			clickCpsInc = Math.max(Game.computedMouseCps - clickCps, 0);
			
			me.bought = 0;
			Game.CalculateGains();

			return cpsInc + clickCpsInc * 30 / MOD.prefs.bigClickInterval;
		}

		
		// アップグレード購入行動.
		MOD.ActionBuyUpgrade = function(it, shopIndex) {
			this.it = it;
			this.shopIndex = shopIndex;
			this.cps = MOD.guessUpgradeCps(it);
			this.price = it.getPrice(0);
			this.exec = function() {
				if (Game.cookies >= this.price) {
					it.buy(1);
					Game.CalculateGains();
					// ログ.
					MOD.sendEventLog({
						'type' : 'Upgrade',
						'id' : it.id,
						'i0' : it.icon[0],
						'i1' : it.icon[1],
					});
				}
			}
			this.debugDrawRank = function(rank) {
				let stateId = 'upgrade' + this.shopIndex + 'saStatus';
				let stateDiv = l(stateId);
				if (!stateDiv) {
					stateDiv = document.createElement('div');
					stateDiv.id = stateId;
					l('upgrade' + this.shopIndex).appendChild(stateDiv);
				}
				let cpsRatio = this.cps / (Game.cookiesPs||1) * 100;
				let cookieRatio = Math.min(Game.cookies / this.price, 1) * 100;
				stateDiv.innerHTML = `
<div style="background-color:${(rank == 1) ? '#ff2020af' : '#602020af'};width:45px;opacity=1.0">
  ${rank}
</div>
<div style="background:linear-gradient(to left, #307000af ${cpsRatio}%, #202020af ${cpsRatio}%);width:45px;text-align:right">
  +${(cpsRatio).toFixed(1)}%
</div>
<div style="background:linear-gradient(to left, #307000af ${cookieRatio}%, #202020af ${cookieRatio}%);width:45px;text-align:right">
  ${(cookieRatio).toFixed(1)}%
</div>
`
			}
		}
		// 待機行動.
		MOD.ActionWait = function(value) {
			this.value = value;
			this.exec = function() {}
			this.debugDrawRank = function(rank) {}
		}
		// 行動比較.
		MOD.compareAction = function(a, b) {
			let curCookie = Game.cookies;
			let curCps = Game.cookiesPsRaw;
			// クリックによる収入は正確に計算するのが難しい...。buf による効果がある部分とない部分がある.
			let clickCps = Game.computedMouseCps * (30 / MOD.prefs.bigClickInterval) * (Game.cookiesPs / Game.cookiesPsRaw);
			curCps += clickCps;
			cmp = function(a, b) { return (a > b) ? -1 : ((a < b) ? 1 : 0); }
			if (((a.price < curCookie) && (b.price < curCookie)) ||
					((a.price > curCookie) && (b.price > curCookie))) {
				// どっちも買えるか、どっちも買えない.
				// CPS / Price で比較する.
				return cmp(a.cps / a.price, b.cps / b.price);
			} else {
				// 買えるものと買えないものの比較.
				// 買えない方を単に待った場合と、買える方を買ってから買えない方を待った場合で、比較.
				let canBuy = (a.price < curCookie) ? a : b;
				let cannotBuy = (canBuy == a) ? b : a;
				if (canBuy.cps / canBuy.price > cannotBuy.cps / cannotBuy.price) {
					// 変える方が効率的なときはそちらを買う.
					if (canBuy == a) {
						return -1;
					} else {
						return 1;
					}
				} else
				{
					// 買えない方を待った場合の時間.
					let waitCannotBuy = (cannotBuy.price - curCookie) / curCps;
					let valueCannotBuy = cannotBuy.cps / waitCannotBuy;
					// 買える方を買ってから待った場合の時間.
					let afterCookie = curCookie - canBuy.price;
					let afterCps = curCps + canBuy.cps;
					let waitCanBuy = (cannotBuy.price - afterCookie) / afterCps;
					let valueCanBuy = (canBuy.cps + cannotBuy.cps) / waitCanBuy;
					// 結果.
					let ret = cmp(valueCanBuy, valueCannotBuy);
					if (canBuy == b) {
						ret *= -1;
					}
					return ret;
				}
			}
		}
		
		// 考える.
		MOD.think = function() {
			// 可能な行動を列挙.
			let actions = [];

			if (MOD.prefs.buyObject) {
				// モノを買う.
				for (let i in Game.ObjectsById) {
					let me = Game.ObjectsById[i];
					if (!me.locked) {
						actions.push(new MOD.ActionBuyObject(me));
					}
				}
			}

			if (MOD.prefs.buyUpgrade) {
				// アップグレードを買う.
				for (let i in Game.UpgradesInStore) {
					let me = Game.UpgradesInStore[i];
					actions.push(new MOD.ActionBuyUpgrade(me, i));
				}
			}

			// その他行動.
//			actions.push(new MOD.ActionWait(100));

			// 行動の効果値でソート.
			actions.sort(MOD.compareAction);

//			console.log(actions);

			return actions;
		}

		// ログ保存（連続データ）.
		MOD.sendContLog = function() {
			let data = {
				fps : Game.fps,
				cookies : Game.cookies,
				cookiesEarned : Game.cookiesEarned,
			};
			MOD.sendLog('cont', data);
		}

		// ログ保存（イベント）
		MOD.sendEventLog = function(hash) {
			let data = {
				'type' : hash['type'],
				'id' : hash['id'] || 0,
				'i0' : hash['i0'] || 0,
				'i1' : hash['i1'] || 0,
				'd0' : hash['d0'] || 0,
				'd1' : hash['d1'] || 0,
				'cookiesPsRaw' : Game.cookiesPsRaw,
			};
			MOD.sendLog('event', data);
		}

		// ログ保存.
		MOD.sendLog = function(type, data) {
			data['bakeryName'] = Game.bakeryName;
			data['seed'] = Game.seed;
			data['T'] = MOD.keepTick + Game.T;

			let xhr = new XMLHttpRequest();
			xhr.open('POST', 'http://127.0.0.1:28080/log_' + type);
			xhr.send(JSON.stringify(data));
		}

		Game.registerHook('reset', function(hard) {
			if (hard) {
				MOD.keepTick = 0;
			}
		});

		Game.registerHook('reincarnate', function() {
			// 転生.
			data = {
				'type' : 'Reincarnate',
				'id' : 0,
				'val0' : Game.resets,
				'val1' : 0,
				'cookiesPsRaw' : Game.cookiesPsRaw
			};
			MOD.sendLog('event', data);
			MOD.sendEventLog( { 'type' : 'Reincarnate', 'i0' : Game.resets });
		});

		//to finish off, we're replacing the big cookie picture with a cool cookie, why not (the image is in this mod's directory)
		Game.Loader.Replace('perfectCookie.png',this.dir+'/gearedCookie.png');

		MOD.ready = 1;
	},
	save:function(){
		//use this to store persistent data associated with your mod
		//note: as your mod gets more complex, you should consider storing a stringified JSON instead
		keepTick= this.keepTick + Game.T;
		return String(keepTick);
	},
	load:function(str){
		//do stuff with the string data you saved previously
		this.keepTick = parseFloat(str) || 0;
	},
	// UI 関連.
});
