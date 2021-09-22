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
		MOD.prefs.bigClickPS = 10;	// 秒間自動クリック数.
		MOD.prefs.goldenClick = 1;	// ゴールデンクッキー等を自動クリックするか？
		MOD.prefs.buyObject = 1;	// 自動購入するか？
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
		l('menuButton').after(MOD.createButton('bigClick', 'bigClickButton', 'BigClick ON', 'BigClick OFF', function(sw) { MOD.setBigCookieClick(sw); }));
		l('bigClickButton').style.display = "none"
		l('menuButton').after(MOD.createButton('goldenClick', 'goldenClickButton', 'GoldClick ON', 'GoldClick OFF', function(sw) { MOD.setGoldenCookieClick(sw); }));
		l('goldenClickButton').style.display = "none"
		l('menuButton').after(MOD.createButton('buyObject', 'buyObjectButton', 'BuyObject ON', 'BuyObject OFF'));
		l('buyObjectButton').style.display = "none"
		// メニュー開く.
		AddEvent(l('menuButton'), 'click', function(){
			MOD.showMenu = 1 - MOD.showMenu;
			if (MOD.showMenu) {
				l('bigClickButton').style.display = "block"
				l('goldenClickButton').style.display = "block"
				l('buyObjectButton').style.display = "block"
			} else {
				l('bigClickButton').style.display = "none"
				l('goldenClickButton').style.display = "none"
				l('buyObjectButton').style.display = "none"
			}
		});

		Game.registerHook('reset',function(hard){
//			if (hard)
//			{
//				MOD.buttonClicks=0;
//				MOD.updateScore();
//			}
		});
		

		// ================================================================================
		// クッキークリック.
		// ================================================================================
		MOD.sendClickEvent = function(elem) {
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

		MOD.bigCookieInterval = 0;
		MOD.goldenCookieInterval = 0;

		// クッキーを１クリック.
		MOD.clickBigCookie = function() {
			MOD.sendClickEvent(l('bigCookie'));
		}
		// クッキーのオートクリックを有効化.
		MOD.setBigCookieClick = function(sw) {
			if (sw) {
				MOD.bigCookieInterval = setInterval(MOD.clickBigCookie, 1000 / MOD.prefs.bigClickPS);
			} else {
				clearInterval(MOD.bigCookieInterval);
			}
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
			}
		}
		// ゴールデンクッキーのオートクリックを有効化.
		MOD.setGoldenCookieClick = function(sw) {
			if (sw) {
				MOD.goldenCookieInterval = setInterval(MOD.clickGoldenCookie, 1000);
			} else {
				clearInterval(MOD.goldenCookieInterval);
			}
		}

		// くっきーくりっく.
		MOD.setBigCookieClick(true);
		// ごーるでんくっきー.
		MOD.setGoldenCookieClick(true);

		// ================================================================================
		// 購入.
		// ================================================================================
		// オブジェクト CPS.
		MOD.getObjectCps = function(obj) {
			return obj.storedCps * Game.globalCpsMult;
		}

		// 更新タイミング.
		Game.registerHook('logic', function() {
			if (Game.ready) {
				let action = MOD.think();
				if (action) {
					action.exec();
				}
			}
		});

		// 建物購入行動.
		MOD.ActionBuyObject = function(it) {
			this.it = it;
			this.cps = MOD.getObjectCps(it);
			this.price = it.getPrice(0);
			this.exec = function() {
				it.buy(1);
			}
		}
		// アップグレード購入行動.
		MOD.ActionBuyUpgrade = function(it) {
			this.it = it;
			this.cps = MOD.guessUpgradeCps(it);
			this.price = it.getPrice(0);
			this.exec = function() {
				it.buy(1);
			}
		}
		// 待機行動.
		MOD.ActionWait = function(value) {
			this.value = value;
			this.exec = function() {}
		}
		// 行動比較.
		MOD.compareAction = function(a, b) {
			let curCookie = Game.cookies;
			let curCps = Game.cookiesPsRaw;
			// クリックによる収入は正確に計算するのが難しい...。buf による効果がある部分とない部分がある.
			let clickCps = Game.computedMouseCps * MOD.prefs.bigClickPS * (Game.cookiesPs / Game.cookiesPsRaw);
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
		
		// 考える.
		MOD.think = function() {
			// 可能な行動を列挙.
			let actions = [];
			// モノを買う.
			for (let i in Game.ObjectsById) {
				let me = Game.ObjectsById[i];
				if (!me.locked) {
					actions.push(new MOD.ActionBuyObject(me));
				}
			}
/*
			// アップグレードを買う.
			for (let i in Game.UpgradesInStore) {
				let me = Game.UpgradesInStore[i];
				actions.push(new MOD.ActionBuyUpgrade(me));
			}
*/
			// その他行動.
//			actions.push(new MOD.ActionWait(100));

			// 最も効果的な行動を返す.
			actions.sort(MOD.compareAction);

//			console.log(actions);

			return actions[0];
		}

		// アップグレードにより増加する CPS を推測.
		MOD.guessUpgradeCps = function(upgrade) {
			return 0;
		}

		// ログ保存.
		MOD.sendLog = function() {
			let data = {
				cookies : Game.cookies,
				cookiesPsRaw : Game.cookiesPsRaw,
				cookiesEarned : Game.cookiesEarned,
				objectsAmount : Game.ObjectsById.map(function(obj) {
					return obj.amount;
				})
			};
			
			let xhr = new XMLHttpRequest();
			xhr.open('POST', 'http://127.0.0.1:28080/append_log');
			xhr.send(JSON.stringify(data));
		}
		setInterval(MOD.sendLog, 60 * 1000); // 一分ごとに記録.
		Game.registerHook('reset', function(hard) {
			if (hard) {
				let xhr = new XMLHttpRequest();
				xhr.open('POST', 'http://127.0.0.1:28080/reset');
				xhr.send('{}');
			}
		});

		//to finish off, we're replacing the big cookie picture with a cool cookie, why not (the image is in this mod's directory)
		Game.Loader.Replace('perfectCookie.png',this.dir+'/gearedCookie.png');
	},
	save:function(){
		//use this to store persistent data associated with your mod
		//note: as your mod gets more complex, you should consider storing a stringified JSON instead
		return String(this.buttonClicks);
	},
	draw:function(){
		if (MOD.showMenu) {
			
		}
	},
	load:function(str){
		//do stuff with the string data you saved previously
//		this.buttonClicks=parseInt(str||0);
//		this.updateScore();
	},
	// UI 関連.
});
