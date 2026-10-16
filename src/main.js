import Phaser from "phaser";

const WIDTH=960, HEIGHT=540, WORLD=5000, GROUND=460;
const COLORS={rock:0x475569, rock2:0x64748b, lava:0xf97316, poison:0x22c55e, hero:0x38bdf8, boss:0xef4444};

class GameScene extends Phaser.Scene {
  constructor(){ super("Game"); }
  create(){
    this.level=1; this.lives=5; this.locked=false; this.gameWon=false;
    this.cursors=this.input.keyboard.createCursorKeys();
    this.keys=this.input.keyboard.addKeys("A,D,W,J,SPACE,ENTER");
    this.createTextures();
    this.physics.world.setBounds(0,0,WORLD,HEIGHT+220);
    this.cameras.main.setBounds(0,0,WORLD,HEIGHT);
    this.hud=this.add.text(16,14,"",{font:"bold 19px Arial",color:"#ffffff",stroke:"#000",strokeThickness:4}).setScrollFactor(0).setDepth(100);
    this.info=this.add.text(16,44,"Nuolilla/A-D liike, W/ylös/välilyönti hyppy, J ampuu",{font:"16px Arial",color:"#fde68a",stroke:"#000",strokeThickness:3}).setScrollFactor(0).setDepth(100);
    this.overlay=this.add.rectangle(WIDTH/2,HEIGHT/2,WIDTH,HEIGHT,0x020617,.82).setScrollFactor(0).setDepth(190).setVisible(false);
    this.dialog=this.add.text(WIDTH/2,HEIGHT/2,"",{font:"bold 28px Arial",color:"#fff",align:"center",wordWrap:{width:700}}).setOrigin(.5).setScrollFactor(0).setDepth(200).setVisible(false);
    this.input.keyboard.on("keydown-ENTER",()=>this.resolveChallenge());
    this.loadLevel(1);
  }
  createTextures(){
    const make=(key,w,h,draw)=>{const g=this.make.graphics({x:0,y:0,add:false});draw(g);g.generateTexture(key,w,h);g.destroy();};
    make("hero",34,46,g=>{g.fillStyle(COLORS.hero).fillRoundedRect(1,1,32,44,8);g.fillStyle(0xffffff).fillCircle(11,14,4).fillCircle(23,14,4);g.fillStyle(0x0f172a).fillCircle(11,14,2).fillCircle(23,14,2);});
    make("boss",74,74,g=>{g.fillStyle(COLORS.boss).fillRoundedRect(1,1,72,72,18);g.fillStyle(0xfff).fillCircle(23,25,7).fillCircle(51,25,7);g.fillStyle(0x111827).fillCircle(23,25,3).fillCircle(51,25,3);});
    make("ball",42,42,g=>{g.fillStyle(0x111827).fillCircle(21,21,15);g.lineStyle(5,0xe5e7eb);for(let i=0;i<8;i++){const a=i*Math.PI/4;g.lineBetween(21+Math.cos(a)*13,21+Math.sin(a)*13,21+Math.cos(a)*20,21+Math.sin(a)*20);}});
    make("potion",26,38,g=>{g.fillStyle(0xe2e8f0).fillRect(9,1,8,8);g.fillStyle(0xa855f7).fillRoundedRect(3,8,20,28,7);});
    make("cube",44,44,g=>{g.fillStyle(0xfacc15).fillRoundedRect(1,1,42,42,7);g.fillStyle(0x713f12).fillCircle(22,15,4).fillCircle(22,30,3);});
    make("shot",14,6,g=>g.fillStyle(0x67e8f9).fillRoundedRect(0,0,14,6,3));
  }
  clearLevel(){
    ["platforms","hazards","balls","potions","cubes","shots","enemyShots","trapSwitches"].forEach(n=>{if(this[n])this[n].clear(true,true)});
    ["boss","wall","hero"].forEach(n=>{if(this[n]){this[n].destroy();this[n]=null}});
    if(this.bg) this.bg.destroy();
  }
  loadLevel(n){
    this.clearLevel(); this.level=n; this.locked=false; this.challenge=null; this.gameWon=false;
    this.physics.world.setBounds(0,0,WORLD,HEIGHT+220);
    const themes=[0x38bdf8,0x818cf8,0xfb923c,0xa78bfa,0x64748b];
    this.cameras.main.setBackgroundColor(themes[(n-1)%themes.length]);
    this.bg=this.add.graphics().setDepth(-10); this.bg.fillStyle(0xffffff,.12);
    for(let x=100;x<WORLD;x+=340)this.bg.fillCircle(x,80+(x%170),42);
    this.platforms=this.physics.add.staticGroup(); this.hazards=this.physics.add.staticGroup();
    this.balls=this.physics.add.group({allowGravity:false}); this.potions=this.physics.add.staticGroup(); this.cubes=this.physics.add.staticGroup();
    this.shots=this.physics.add.group({allowGravity:false}); this.enemyShots=this.physics.add.group({allowGravity:false}); this.trapSwitches=this.physics.add.staticGroup();
    const gaps=[]; for(let i=0;i<6+n;i++)gaps.push({x:520+i*(520-Math.min(n*9,60)),w:105+(i%3)*18,type:i%2?"poison":"lava"});
    let cursor=0; for(const gap of gaps){this.platform(cursor,(gap.x-cursor),GROUND);this.hazard(gap.x,gap.w,gap.type);cursor=gap.x+gap.w} this.platform(cursor,WORLD-cursor,GROUND);
    this.hero=this.physics.add.sprite(110,360,"hero").setCollideWorldBounds(false).setDepth(10); this.hero.speed=235;this.hero.jump=480;this.hero.facing=1;this.hero.invincibleUntil=0;this.hero.shield=0;
    this.cameras.main.startFollow(this.hero,true,.09,.09); this.physics.add.collider(this.hero,this.platforms);
    this.physics.add.overlap(this.hero,this.hazards,()=>this.damage("Vaarallinen rotko!"));
    if(n>1){for(let i=0;i<3+n;i++)this.spawnBall(900+i*630, n);} // taso 1 ilman palloja
    for(let i=0;i<3;i++)this.spawnPotion(650+i*1250,["jump","speed","shield"][i]);
    for(let i=0;i<2;i++)this.spawnCube(1450+i*1800,i);
    this.boss=this.physics.add.sprite(WORLD-360,GROUND-72,"boss").setImmovable(true).setAllowGravity(false);this.boss.hp=5+n*2;this.boss.maxHp=this.boss.hp;this.boss.lastShot=0;
    this.physics.add.overlap(this.hero,this.boss,()=>this.damage("Vastustaja osui!"));
    this.physics.add.overlap(this.shots,this.boss,(s,b)=>{s.destroy();b.hp--;if(b.hp<=0)this.bossDefeated();});
    this.physics.add.overlap(this.enemyShots,this.hero,(h,s)=>{s.destroy();this.damage("Vastustajan ammus osui!");});
    if(n===10)this.makeTrapWall();
    this.updateHud(); this.info.setText(n===1?"Taso 1: ei piikkipalloja. Etene oikealle.":"Piikkipallot vierivät vastaan kerran ja katoavat.");
  }
  platform(x,w,y){if(w<=0)return;const r=this.add.rectangle(x+w/2,y,w,HEIGHT-y,COLORS.rock);this.physics.add.existing(r,true);this.platforms.add(r);for(let px=x+25;px<x+w;px+=70)this.add.circle(px,y+8,20,COLORS.rock2).setDepth(1);}
  hazard(x,w,type){const color=type==="lava"?COLORS.lava:COLORS.poison;const r=this.add.rectangle(x+w/2,GROUND+46,w,92,color);this.physics.add.existing(r,true);r.kind=type;this.hazards.add(r);this.add.text(x+w/2,GROUND+23,type==="lava"?"🔥":"☠",{font:"32px Arial"}).setOrigin(.5);}
  spawnBall(x,level){const b=this.balls.create(x,GROUND-28,"ball");b.setVelocityX(-(105+level*12));b.setAngularVelocity(-320);b.passed=false;this.physics.add.overlap(this.hero,b,()=>this.damage("Piikkipallo osui!"));}
  spawnPotion(x,type){const p=this.potions.create(x,GROUND-62,"potion");p.effect=type;this.physics.add.overlap(this.hero,p,()=>{if(!p.active)return;if(type==="jump"){this.hero.jump=650;this.time.delayedCall(6000,()=>{if(this.hero)this.hero.jump=480})}if(type==="speed"){this.hero.speed=330;this.time.delayedCall(6000,()=>{if(this.hero)this.hero.speed=235})}if(type==="shield")this.hero.shield+=2;p.destroy();this.info.setText(`Taikajuoma: ${type}!`);});}
  spawnCube(x,index){const c=this.cubes.create(x,GROUND-65,"cube");c.used=false;c.index=index;this.physics.add.overlap(this.hero,c,()=>{if(c.used)return;c.used=true;this.startChallenge(c);});}
  startChallenge(c){this.locked=true;this.physics.pause();const tasks=[{q:"Paljonko on 7 + 5?\nPaina ENTER, jos vastaus on 12.",ok:true},{q:"Sattuma muuttaa kokoasi!\nPaina ENTER jatkaaksesi.",ok:true},{q:"Jatka sarjaa 2, 4, 6, 8.\nPaina ENTER.",ok:true}];this.challenge={...tasks[(this.level+c.index)%tasks.length],cube:c};this.overlay.setVisible(true);this.dialog.setText(this.challenge.q).setVisible(true);}
  resolveChallenge(){if(!this.challenge)return;const outcomes=["big","small","jump"];const o=outcomes[(this.level+this.challenge.cube.index)%3];if(o==="big"){this.hero.setScale(1.45);this.info.setText("Kasvoit suureksi: ammukset ovat tehokkaampia!")}if(o==="small"){this.hero.setScale(.72);this.info.setText("Pienenit ja liikut nopeammin!");this.hero.speed=300}if(o==="jump"){this.hero.jump=680;this.info.setText("Sait superhypyn!")}this.challenge.cube.destroy();this.challenge=null;this.overlay.setVisible(false);this.dialog.setVisible(false);this.physics.resume();this.locked=false;}
  makeTrapWall(){this.wall=this.add.rectangle(WORLD-720,GROUND-110,70,220,0x78716c);this.physics.add.existing(this.wall,true);this.wall.hp=3;this.physics.add.collider(this.hero,this.wall);this.physics.add.overlap(this.shots,this.wall,(s,w)=>{s.destroy();this.info.setText("Muuri ei hajoa ampumalla. Laukaise kolme ansaa!")});for(let i=0;i<3;i++){const sw=this.trapSwitches.create(WORLD-1250+i*150,GROUND-52,"cube").setTint(0xef4444);sw.done=false;this.physics.add.overlap(this.shots,sw,(s,t)=>{s.destroy();if(t.done)return;t.done=true;t.setTint(0x22c55e);this.wall.hp--;this.info.setText(`Ansa laukaistu. Jäljellä ${this.wall.hp}.`);if(this.wall.hp<=0){this.wall.destroy();this.wall=null;this.info.setText("Kaikki ansat laukaistu. Muuri hävisi!")}})}}
  shoot(){if(this.locked||!this.hero.active)return;const s=this.shots.create(this.hero.x+this.hero.facing*24,this.hero.y,"shot");s.setVelocityX(this.hero.facing*520);this.time.delayedCall(1800,()=>{if(s.active)s.destroy()});}
  damage(msg){if(!this.hero||this.time.now<this.hero.invincibleUntil||this.locked)return;if(this.hero.shield>0){this.hero.shield--;this.hero.invincibleUntil=this.time.now+800;this.info.setText("Kilpi torjui osuman!");this.updateHud();return}this.hero.invincibleUntil=this.time.now+1200;this.lives--;this.cameras.main.shake(180,.012);if(this.lives<=0){this.lives=5;this.level=1;this.showMessage("Peli päättyi\nENTER aloittaa alusta",()=>this.loadLevel(1));return}this.info.setText(`${msg} Elämiä jäljellä ${this.lives}.`);this.hero.setPosition(110,340).setVelocity(0);this.updateHud();}
  bossDefeated(){if(!this.boss)return;this.boss.destroy();this.boss=null;if(this.level===10){this.gameWon=true;this.showMessage("VOITIT KOKO PELIN!\nENTER aloittaa alusta",()=>{this.lives=5;this.loadLevel(1)})}else this.showMessage(`Taso ${this.level} läpäisty!\nENTER jatkaa tasolle ${this.level+1}`,()=>this.loadLevel(this.level+1));}
  showMessage(text,cb){this.locked=true;this.physics.pause();this.overlay.setVisible(true);this.dialog.setText(text).setVisible(true);const key=this.input.keyboard.once("keydown-ENTER",()=>{this.overlay.setVisible(false);this.dialog.setVisible(false);this.physics.resume();this.locked=false;cb()});return key;}
  updateHud(){const boss=this.boss?` | Boss ${Math.max(0,this.boss.hp)}/${this.boss.maxHp}`:"";this.hud.setText(`❤ ${this.lives}/5 | Taso ${this.level}/10 | Kilpi ${this.hero?.shield||0}${boss}`)}
  update(time){if(!this.hero||this.locked)return;let vx=0;if(this.cursors.left.isDown||this.keys.A.isDown){vx=-this.hero.speed;this.hero.facing=-1}if(this.cursors.right.isDown||this.keys.D.isDown){vx=this.hero.speed;this.hero.facing=1}this.hero.setVelocityX(vx);const grounded=this.hero.body.blocked.down||this.hero.body.touching.down;if((Phaser.Input.Keyboard.JustDown(this.cursors.up)||Phaser.Input.Keyboard.JustDown(this.keys.W)||Phaser.Input.Keyboard.JustDown(this.keys.SPACE))&&grounded)this.hero.setVelocityY(-this.hero.jump);if(Phaser.Input.Keyboard.JustDown(this.keys.J))this.shoot();
    this.balls.children.each(b=>{if(!b)return;if(b.x<this.hero.x-700||b.x<0)b.destroy()});
    this.shots.children.each(s=>{if(s&&s.x>WORLD)s.destroy()});this.enemyShots.children.each(s=>{if(s&&(s.x<0||s.x>WORLD))s.destroy()});
    if(this.hero.y>HEIGHT+90)this.damage("Putosit rotkoon!");
    if(this.boss&&this.boss.active&&time-this.boss.lastShot>Math.max(600,1500-this.level*70)&&Math.abs(this.boss.x-this.hero.x)<850){this.boss.lastShot=time;const s=this.enemyShots.create(this.boss.x-40,this.boss.y,"shot").setTint(0xff4444);s.setVelocityX(-260-this.level*12)}
    this.updateHud();
  }
}

new Phaser.Game({type:Phaser.AUTO,parent:"game",width:WIDTH,height:HEIGHT,backgroundColor:"#0f172a",physics:{default:"arcade",arcade:{gravity:{x:0,y:1100},debug:false}},scene:[GameScene],scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});
