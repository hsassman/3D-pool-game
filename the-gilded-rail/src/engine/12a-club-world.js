/* Static environmental storytelling: a club with a history, not an empty backdrop.
   Six meshes, three small canvases, no lights, shadows or per-frame callbacks. */
const ClubWorld={
  group:null,
  build(){
    if(this.group)return;
    this.group=new THREE.Group();this.group.name='Club history';scene.add(this.group);
    const board=(title,subtitle,lines,w,h,x,y,z,yaw)=>{
      const cv=document.createElement('canvas');cv.width=768;cv.height=512;
      const c=cv.getContext('2d');c.fillStyle='#14221d';c.fillRect(0,0,768,512);
      c.strokeStyle='#a18b56';c.lineWidth=3;c.strokeRect(18,18,732,476);
      c.lineWidth=1;c.strokeRect(28,28,712,456);c.textAlign='center';
      c.fillStyle='#d9c697';c.font='24px Georgia';c.fillText(subtitle,384,86);
      c.font='bold 43px Georgia';c.fillText(title,384,151);
      c.beginPath();c.moveTo(126,181);c.lineTo(642,181);c.stroke();
      c.fillStyle='#ded9c7';c.font='25px Georgia';
      lines.forEach((line,i)=>c.fillText(line,384,244+i*49));
      const texture=new THREE.CanvasTexture(cv);texture.encoding=THREE.sRGBEncoding;
      texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
      const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=yaw;
      const frame=new THREE.Mesh(new THREE.BoxGeometry(w+.045,h+.045,.025),brassMat);
      const art=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:texture,roughness:.84}));
      art.position.z=.014;g.add(frame,art);this.group.add(g);
    };
    board('THE GILDED RAIL','PRIVATE BILLIARD CLUB · EST. 1924',[
      'A quiet table. An honest wager.',
      'The harbor sleeps. The club does not.',
      'Members & their guests welcome.'
    ],1.26,.84,3.9,.92,ROOM_BZ+.06,0);
    board('THE MEMBERS’ TABLES','FIVE ROOMS · ONE HOUSE',[
      'The Back Room  /  The High Table',
      'The Velvet Room  /  The Gilded Circle',
      'The Members’ Floor welcomes you.'
    ],1.26,.84,-3.5,.92,ROOM_BZ+.06,0);
    board('HOUSE ETIQUETTE','PLEASE RESPECT THE TABLE',[
      'Chalk before you strike.',
      'Keep glasses off the playing cloth.',
      'Leave the next player a clean table.'
    ],.66,.44,ROOM_RX-.055,.65,3.1,-Math.PI/2);
  }
};
