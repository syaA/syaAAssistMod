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
		// バージョン.
		// ================================================================================
		MOD.version = '1.0'

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
		MOD.prefs.sendSaveInterval = 24 * 60 * 60 * 30; // セーブデータ送信間隔(フレーム).
		MOD.keepTick;	// 通しティック.
		MOD.prevT = 0;
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

		// クリック CPS
		// Game.mouseCps() から一時的 buff の効果を抜いたもの.
		MOD.mouseCpsRaw = function() {
			var add=0;
			if (Game.Has('Thousand fingers')) add+=		0.1;
			if (Game.Has('Million fingers')) add*=		5;
			if (Game.Has('Billion fingers')) add*=		10;
			if (Game.Has('Trillion fingers')) add*=		20;
			if (Game.Has('Quadrillion fingers')) add*=	20;
			if (Game.Has('Quintillion fingers')) add*=	20;
			if (Game.Has('Sextillion fingers')) add*=	20;
			if (Game.Has('Septillion fingers')) add*=	20;
			if (Game.Has('Octillion fingers')) add*=	20;
			if (Game.Has('Nonillion fingers')) add*=	20;
			
			var num=0;
			for (var i in Game.Objects) {num+=Game.Objects[i].amount;}
			num-=Game.Objects['Cursor'].amount;
			add=add*num;
			if (Game.Has('Plastic mouse')) add+=Game.cookiesPsRaw*0.01;
			if (Game.Has('Iron mouse')) add+=Game.cookiesPsRaw*0.01;
			if (Game.Has('Titanium mouse')) add+=Game.cookiesPsRaw*0.01;
			if (Game.Has('Adamantium mouse')) add+=Game.cookiesPsRaw*0.01;
			if (Game.Has('Unobtainium mouse')) add+=Game.cookiesPsRaw*0.01;
			if (Game.Has('Eludium mouse')) add+=Game.cookiesPsRaw*0.01;
			if (Game.Has('Wishalloy mouse')) add+=Game.cookiesPsRaw*0.01;
			if (Game.Has('Fantasteel mouse')) add+=Game.cookiesPsRaw*0.01;
			if (Game.Has('Nevercrack mouse')) add+=Game.cookiesPsRaw*0.01;
			if (Game.Has('Armythril mouse')) add+=Game.cookiesPsRaw*0.01;
			if (Game.Has('Technobsidian mouse')) add+=Game.cookiesPsRaw*0.01;
			if (Game.Has('Plasmarble mouse')) add+=Game.cookiesPsRaw*0.01;
			if (Game.Has('Miraculite mouse')) add+=Game.cookiesPsRaw*0.01;
			
			if (Game.Has('Fortune #104')) add+=Game.cookiesPsRaw*0.01;
			var mult=1;
			
			
			if (Game.Has('Santa\'s helpers')) mult*=1.1;
			if (Game.Has('Cookie egg')) mult*=1.1;
			if (Game.Has('Halo gloves')) mult*=1.1;
			if (Game.Has('Dragon claw')) mult*=1.03;
			
			if (Game.Has('Aura gloves'))
			{
				mult*=1+0.05*Math.min(Game.Objects['Cursor'].level,Game.Has('Luminous gloves')?20:10);
			}
			
			mult*=Game.eff('click');
			
			if (Game.hasGod)
			{
				var godLvl=Game.hasGod('labor');
				if (godLvl==1) mult*=1.15;
				else if (godLvl==2) mult*=1.1;
				else if (godLvl==3) mult*=1.05;
			}
/*			
			for (var i in Game.buffs)
			{
				if (typeof Game.buffs[i].multClick != 'undefined') mult*=Game.buffs[i].multClick;
			}
*/			
			//if (Game.hasAura('Dragon Cursor')) mult*=1.05;
			mult*=1+Game.auraMult('Dragon Cursor')*0.05;
			
			var out=mult*Game.ComputeCps(1,Game.Has('Reinforced index finger')+Game.Has('Carpal tunnel prevention cream')+Game.Has('Ambidextrous'),add);
			
//			out=Game.runModHookOnValue('cookiesPerClick',out);
			
//			if (Game.hasBuff('Cursed finger')) out=Game.buffs['Cursed finger'].power;
			return out;
		}

		MOD.computedMouseCpsRaw = 1;
		Game.registerHook('cookiesPerClick', function(mouseCps) {
			MOD.computedMouseCpsRaw = MOD.mouseCpsRaw();
			return mouseCps;
		});
		MOD.getClickCpsRaw = function() {
			if (!MOD.prefs.bigClick) {
				return 0;
			}

			return MOD.computedMouseCpsRaw * 30 / MOD.prefs.bigClickInterval;
		}

		// ================================================================================
		// 購入.
		// ================================================================================
		MOD.actions = [];
		// 更新タイミング.
		Game.registerHook('logic', function() {
			if (!Game.ready) {
				return;
			}
			if (Game.OnAscend || (Game.AscendTimer != 0)) {
				return;
			}
			if (!MOD.ready) {
				return;
			}


			let elapsed = Game.T - MOD.prevT;
			if (elapsed > 0) {
				MOD.keepTick += elapsed;
			}
			let tick = MOD.keepTick;
			if (!tick) {
				return;
			}
			MOD.prevT = Game.T

			// クッキークリック.
			if (MOD.prefs.bigClick && ((tick % MOD.prefs.bigClickInterval) == 0)) {
				MOD.clickBigCookie();
			}

			// ゴールドクッキークリック.
			if (MOD.prefs.goldenClick && ((tick % MOD.prefs.goldenCheckInterval) == 0)) {
				MOD.clickGoldenCookie();
			}

			// 購入順位を決める.
			if ((tick % MOD.prefs.buyCheckInterval) == 0) {
				MOD.actions = MOD.think();
			}
			// 購入.
			if ((tick % (MOD.prefs.buyCheckInterval / 10)) == 0) {
				// luckyCps より多い場合のみ購入をすすめる.
				let goldenStatus = MOD.guessGoldenCookieStatus();
				let luckyCps = MOD.guessLuckyCps(Game.cookies, Game.cookiesPsRaw, goldenStatus).cps;

				let saving = true;
				if (MOD.actions.length > 0) {
					let action = MOD.actions[0];
					let afterLuckyCps = MOD.guessLuckyCps(Math.max(Game.cookies - action.price), Game.cookiesPsRaw + action.cps, goldenStatus).cps;
					action.savingRatio = (afterLuckyCps + action.cps) / luckyCps * 100;
					if ((afterLuckyCps + action.cps) > luckyCps) {
						action.exec();
						if (action.isObject) {
							MOD.actions.shift();
						} else {
							MOD.actions = [];
						}
						saving = false;
					}
				}

				// 状況表示を更新.
				MOD.actions.forEach(function(act, index) {
					act.debugDrawRank(index + 1, saving);
				});
			}
			

			// ログ送信.
			if (((tick % MOD.prefs.sendLogInterval) == 0)) {
				MOD.sendContLog();
			}

			// セーブデータのバックアップ.
			if (((tick % MOD.prefs.sendSaveInterval) == 0)) {
				MOD.sendSave();
			}
		});

		// CPS を

		// オブジェクト CPS.
		MOD.guessObjectCps = function(obj) {
			Game.CalculateGains();
			let cps = Game.cookiesPsRaw;
			let clickCps = MOD.getClickCpsRaw();

			obj.amount++;
			Game.CalculateGains();

			cpsInc = Math.max(Game.cookiesPsRaw - cps, 0);
			clickCpsInc = Math.max(MOD.getClickCpsRaw() - clickCps, 0);
			
			obj.amount--;
			Game.CalculateGains();

			return cpsInc + clickCpsInc;
		}

		// オブジェクト購入行動.
		MOD.ActionBuyObject = function(it, luckyCps) {
			this.it = it;
			this.cps = MOD.guessObjectCps(it);
			this.price = it.getPrice(0);
			this.isObject = true

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
					return true;
				}
				return false;
			}
			this.debugDrawRank = function(rank, saving) {
				let stateId = 'product' + it.id + 'saStatus';
				let stateDiv = l(stateId);
				if (!stateDiv) {
					stateDiv = document.createElement('div');
					stateDiv.id = stateId;
					l('productIcon' + it.id).appendChild(stateDiv);
				}
				let cpsRatio = this.cps / ((Game.cookiesPsRaw||1) + MOD.getClickCpsRaw()) * 100;
				let cookieRatio = Math.min(Game.cookies / this.price, 1) * 100;
				stateDiv.innerHTML = `
<div style="background-color:${(rank == 1) ? '#ff2020af' : '#602020af'};width:45px;">
  ${rank}${((rank == 1) && saving) ? (':P(' + this.savingRatio.toFixed(1) + '%)') : ''}
</div>
<div style="background:linear-gradient(to left, #307000af ${cpsRatio}%, #202020af ${cpsRatio}%);width:45px;text-align:right">
  ${cpsRatio > 0 ? '+' : ''}${(cpsRatio).toFixed(1)}%
</div>
<div style="background:linear-gradient(to left, #307000af ${cookieRatio}%, #202020af ${cookieRatio}%);width:45px;text-align:right">
  ${(cookieRatio).toFixed(1)}%
</div>
`
			}
		}

		// アップグレード CPS.
		MOD.guessUpgradeCps = function(me) {
			// ゴールデンクッキーに関するアップグレードは独自に計算.
			// 大雑把に 50% 程度の Frenzy 効果のみで、CPS 増加期待値を計算する.
			// 貯蓄状態の表現や、Frenzy 中の Lucky! などは乗っていないので本来よりも低め？
			if (Game.goldenCookieUpgrades.includes(me.name)) {
				let s0 = MOD.guessGoldenCookieStatus();
				let s0interval = s0.maxInterval;
				let s1 = MOD.guessGoldenCookieStatus(me.name);
				let s1interval = s1.maxInterval;
				return (6 * s1.duration / s1interval * 0.5 - 6 * s0.duration / s0interval * 0.5) * Game.cookiesPsRaw;
			} else {
				// ゲーム本体の機能に任せる.
				Game.CalculateGains();
				let cps = Game.cookiesPsRaw;
				let clickCps = MOD.getClickCpsRaw();

				me.bought = 1;
				Game.CalculateGains();

				cpsInc = Math.max(Game.cookiesPsRaw - cps, 0);
				clickCpsInc = Math.max(MOD.getClickCpsRaw() - clickCps, 0);
			
				me.bought = 0;
				Game.CalculateGains();

				return cpsInc + clickCpsInc;
			}
		}

		
		// アップグレード購入行動.
		MOD.ActionBuyUpgrade = function(it, shopIndex, luckyCps) {
			this.it = it;
			this.shopIndex = shopIndex;
			this.cps = MOD.guessUpgradeCps(it, luckyCps);
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
					// 対象の建物があるなら、それらの CPS も更新する.
					[it.buildingTie, it.building1, it.building2].forEach(function(building) {
						if (typeof building != 'undefined') {
							let obj = building;
							if (typeof obj == 'number') {
								obj = Game.ObjectsById[obj];
							}
							// ログ.
							MOD.sendEventLog({
								'type' : 'Object',
								'id' : obj.id,
								'i0' : obj.amount,
								'd0' : obj.storedTotalCps,
							});
						}
					});
					return true;
				}
				return false;
			}
			this.debugDrawRank = function(rank, saving) {
				let stateId = 'upgrade' + this.shopIndex + 'saStatus';
				let stateDiv = l(stateId);
				if (!stateDiv) {
					stateDiv = document.createElement('div');
					stateDiv.id = stateId;
					l('upgrade' + this.shopIndex).appendChild(stateDiv);
				}
				let cpsRatio = this.cps / ((Game.cookiesPsRaw||1) + MOD.getClickCpsRaw()) * 100;
				let cookieRatio = Math.min(Game.cookies / this.price, 1) * 100;
				stateDiv.innerHTML = `
<div style="background-color:${(rank == 1) ? '#ff2020af' : '#602020af'};width:45px;opacity=1.0">
  ${rank}${((rank == 1) && saving) ? (':P(' + this.savingRatio.toFixed(1) + '%)') : ''}
</div>
<div style="background:linear-gradient(to left, #307000af ${cpsRatio}%, #202020af ${cpsRatio}%);width:45px;text-align:right">
  ${cpsRatio > 0 ? '+' : ''}${(cpsRatio).toFixed(1)}%
</div>
<div style="background:linear-gradient(to left, #307000af ${cookieRatio}%, #202020af ${cookieRatio}%);width:45px;text-align:right">
  ${(cookieRatio).toFixed(1)}%
</div>
`
			}
		}
		// 貯蓄行動.
		MOD.ActionSaving = function(luckyCps) {
			let s = MOD.guessGoldenCookieStatus();
			let nextCookies = Game.cookies + Game.cookiesPsRaw + MOD.getClickCpsRaw();
			this.cps = MOD.guessLuckyCps(nextCookies, Game.cookiesPsRaw, s).cps - luckyCps;
			this.price = nextCookies * s.maxInterval;
			this.luckyCps = luckyCps;
			this.isSaving = true;

			this.exec = function() { return true; }
			this.debugDrawRank = function(rank) {
				let stateId = 'saving' + '0' +  'saStatus';
				let stateDiv = l(stateId);
				if (!stateDiv) {
					l('sectionLeft').insertAdjacentHTML('beforeend', `<div id=${stateId} style="position:absolute;z-index:200"></div>`);
					stateDiv = l(stateId);
				}
				let cpsRatio = this.cps / ((Game.cookiesPsRaw||1) + MOD.getClickCpsRaw()) * 100;
				let lucky = MOD.guessLuckyCps(Game.cookies, Game.cookiesPsRaw);
				let cpsLuckyRatio = lucky.cps / ((Game.cookiesPsRaw||1) + MOD.getClickCpsRaw()) * 100;

				let targetCookie = lucky.frenzyLuckyCps > lucky.luckyCps ? Game.cookiesPsRaw * 900 / 0.15 * 7 : Game.cookiesPsRaw * 900 / 0.15;
				let cookieRatio = Game.cookies / targetCookie * 100;
				stateDiv.innerHTML = `
<div style="background-color:${(rank == 1) ? '#ff2020af' : '#602020af'};width:60px;opacity=1.0">
  ${rank}:Saving
</div>
<div style="background:linear-gradient(to left, #307000af ${cpsRatio}%, #202020af ${cpsRatio}%);width:60px;text-align:right">
  ${cpsRatio > 0 ? '+' : ''}${(cpsRatio).toFixed(1)}%
</div>
<div style="background:linear-gradient(to left, #307000af ${cpsLuckyRatio}%, #202020af ${cpsLuckyRatio}%);width:60px;text-align:right">
  ${cpsLuckyRatio > 0 ? '+' : ''}${(cpsLuckyRatio).toFixed(1)}%
</div>
<div style="background:linear-gradient(to left, #307000af ${cookieRatio}%, #202020af ${cookieRatio}%);width:60px;text-align:right">
  ${(cookieRatio).toFixed(1)}%
</div>
`
			}
		}

		// 行動比較.
		MOD.compareAction = function(a, b) {
			let curCookie = Game.cookies;
			let curCps = Game.cookiesPsRaw;
			let clickCps = MOD.getClickCpsRaw();
			curCps += clickCps;
			cmp = function(a, b) { return (a > b) ? -1 : ((a < b) ? 1 : 0); }
			// 参考:https://www.reddit.com/r/CookieClicker/comments/1lsuov/yet_another_calculator_this_one_in_htmljavascript/cc3eqs7/
			func = function(o) {
				if (o.cps <= 0) {
					return Infinity;
				} else if (curCps <= 0) {
					return o.price / o.cps;
				} else {
					return o.price / curCps + o.price / o.cps;
				}
			}
			return cmp(func(b), func(a));
		}

		// ゴールデンクッキー状態..
		MOD.guessGoldenCookieStatus = function(newUpgrade) {
			f = function(upgrade) { return Game.Has(upgrade) || (upgrade == newUpgrade) }
			let minInterval = 409;	// wiki より.
			let maxInterval = 482;
			let duration = 77;	// Frenzy 効果期間
			if (f('Lucky day')) { minInterval /= 2; maxInterval /= 2; }
			if (f('Serendipity')) { minInterval /= 2; maxInterval /= 2; }
			if (f('Get lucky')) { duration *= 2; }
			if (f('Heavenly luck')) { minInterval *= 0.95; maxInterval /= 2; }
			if (f('Green yeast digestives')) { minInterval *= 0.99; maxInterval /= 2; }
			if (f('Lasting fortune')) { duration *= 1.1; }
			if (f('Lucky digit')) { duration*=1.01; }
			if (f('Lucky number')) { duration*=1.01; }
			if (f('Green yeast digestives')) { duration*=1.01; }
			if (f('Lucky payout')) { duration*=1.01; }
			return { 'minInterval': minInterval, 'maxInterval': maxInterval, 'duration': duration };
		}

		// Lucky! の確率.
			const LuckyP = 0.4;
		// Frenzy のあとに Lucky! が出る確率
		let frenzyLuckyP = 0.8;

		// Lucky! の推定 CpS
		MOD.guessLuckyCps = function(cookies, cps, st) {
			if (!MOD.prefs.goldenClick) {
				return 0;
			}
			if (!st) {
				st = MOD.guessGoldenCookieStatus();
			}
			let interval = st.maxInterval;
			// Lucky!で得られる値
			let luckyVal = Math.min( cookies * 0.15, cps * 900 );
			let luckyCps = luckyVal / interval * LuckyP * 0.5; // 2回に1回で 0.5.
			// Frenzy 中の Lucky!
			let frenzyLuckyCps = 0;
			if (st.minInterval < st.duration) {
				let frenzyLuckyVal = Math.min( cookies * 0.15, cps * 900 * 7 );
				let frenzyLuckyCps = frenzyLuckyVal / interval * frenzyLuckyP * 0.5; // 2回に1回で 0.5.
			}
			return { 'cps':Math.max(luckyCps, frenzyLuckyCps), 'luckyCps':luckyCps, 'frenzyLuckyCps':frenzyLuckyCps };
		}

		// 考える.
		MOD.think = function() {
			// 可能な行動を列挙.
			let actions = [];

			// 貯蓄.
			// ゴールデンクッキーの Lucky! で最大値を得られるように貯蓄する。
			// Lucky! : 現在のクッキー の 15% or CpS の 900 倍の小さい方.
			//          CpS の 900 倍の 100/15 倍 = 6000 Cps 分貯蓄する.
			// Frenzy 中の Lucky! ： 42000 CpS 分貯蓄する.
			//          Frenzy 持続時間 t, 平均 GC 発生間隔 T に対して、
			//          t / T * 0.8 * 0.5 くらいと考える.
			//          Frenzy の次の Lucky! の可能性が 80% くらい、おおよそ交互と考えて 50%.
			// Lucky! の確率. 大体.
			let goldenStatus = MOD.guessGoldenCookieStatus();
			let luckyCps = MOD.guessLuckyCps(Game.cookies, Game.cookiesPsRaw, goldenStatus).cps;

			actions.push(new MOD.ActionSaving(luckyCps));
			
			// モノを買う.
			if (MOD.prefs.buyObject) {
				for (let i in Game.ObjectsById) {
					let me = Game.ObjectsById[i];
					if (!me.locked) {
						actions.push(new MOD.ActionBuyObject(me, luckyCps));
					}
				}
			}

			// アップグレードを買う.
			if (MOD.prefs.buyUpgrade) {
				for (let i in Game.UpgradesInStore) {
					let me = Game.UpgradesInStore[i];
					actions.push(new MOD.ActionBuyUpgrade(me, i, luckyCps));
				}
			}

			// 行動の効果値でソート.
			actions.sort(MOD.compareAction);

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
			data['T'] = MOD.keepTick;

			let xhr = new XMLHttpRequest();
			xhr.open('POST', 'http://127.0.0.1:28080/log_' + type);
			xhr.send(JSON.stringify(data));
		}

		// セーブ保存.
		MOD.sendSave = function() {
			let data = { 
				'bakeryName' :  Game.bakeryName,
				'seed' : Game.seed,
				'save' : Game.WriteSave(1)
			};

			let xhr = new XMLHttpRequest();
			xhr.open('POST', 'http://127.0.0.1:28080/backup_save');
			xhr.send(JSON.stringify(data));
		}

		Game.registerHook('reset', function(hard) {
			if (hard) {
				MOD.keepTick = 0;
				MOD.prevT = 0;
			}
			MOD.actions = [];
		});

		Game.registerHook('reincarnate', function() {
			// 転生.
			data = {
				'type' : 'Reincarnate',
				'id' : 0,
				'i0' : Game.resets,
				'i1' : 0,
				'cookiesPsRaw' : Game.cookiesPsRaw
			};
			MOD.sendLog('event', data);
			MOD.sendEventLog( data );
		});

		//to finish off, we're replacing the big cookie picture with a cool cookie, why not (the image is in this mod's directory)
		Game.Loader.Replace('perfectCookie.png',this.dir+'/gearedCookie.png');

		MOD.ready = 1;
	},
	save:function(){
		//use this to store persistent data associated with your mod
		//note: as your mod gets more complex, you should consider storing a stringified JSON instead
		data = {
			'version' : this.version,
			'keepTick' : this.keepTick,
		};
		return JSON.stringify(data);
	},
	load:function(str){
		//do stuff with the string data you saved previously
		data = JSON.parse(str);
		if (data.version == '1.0') {
			this.keepTick = data['keepTick'];
		}
	},
	// UI 関連.
});
