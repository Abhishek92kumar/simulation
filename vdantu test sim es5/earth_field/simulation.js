function Simulation() {
//const loader = new THREE.TextureLoader();
    let renderer, scene, camera;
    let groundTex, earthTex, compassTex1, compassTex2;
    let equator, magnet, earth, compassH, compassV, needle, arrowNS, locationCompass, magMeridian, geogMeridian,
        meridianfield, magCircle, geogCircle, compassArrow, planeGM, planeMM, field
    let bgColor;
    let canvas;


    let resourcePaths = ['checker.png', 'earth.jpg', 'compass.png', 'compass.png'];
    let resources = [];
    let loadedResources = 0;
    let src0, src1;
    let vField;
    let dragControls, orbitControls;

    let magColor = "#ff0000"
    let geogColor = "#00ffaa"

    let numJsLaded = 0;

    function initialize(c, dirurl) {
        $.getScript(dirurl + "/three.min.js", function () {
            jsLoadcallback(c, dirurl);
        });
    }

    function jsLoadcallback(c, dirurl) {
        numJsLaded++;
        if (numJsLaded == 1) {
            $.getScript(dirurl + "/OrbitControls.js", function () {
                jsLoadcallback(c, dirurl);
            });
        } else if (numJsLaded == 2) {
            $.getScript(dirurl + "/DragControls.js", function () {
                jsLoadcallback(c, dirurl);
            });
        } else {
            canvas = c;
            bgColor = new THREE.Color("rgb(0,34,34)");
            src0 = new THREE.Vector3(0, 0.06, 0);
            src1 = new THREE.Vector3(0, -0.06, 0);
            vField = new VectorField();
            for (let i = 0; i <= 3; i++) {
                resources[i] = new Image();
                resources[i].src = dirurl + "/" + resourcePaths[i];
                resources[i].onload = load;
            }
        }
    }


    function load(obj) {
        loadedResources++;
        if (loadedResources == resourcePaths.length) {
            init();
        }
    }


    function loadTexture(index, repeat, n) {
        let texture = new THREE.Texture(resources[index]);
        if (repeat) {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(n, n);
        }
        texture.needsUpdate = true;
        return texture;
    }

    let settings = {
        intensity: 0.2,
        declination: 11,
        earthOpacity: 0.7,
        showMeridian: true,
        horizontalCompass: true,
        verticalCompass: true,
        showCompassField: true,
        isRunning: false
    }

    function BodyPhysics(mesh) {
        this.mesh = mesh;
        this.velocity = new THREE.Vector3();
        this.angularVelocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.angularAcceleration = new THREE.Vector3();
        this.update = function (dt) {
            this.velocity.addScaledVector(this.acceleration, dt);
            this.angularVelocity.addScaledVector(this.angularAcceleration, dt);
            this.mesh.position.addScaledVector(this.velocity, dt);
            let v = this.mesh.rotation;
            v = new THREE.Vector3(v.x, v.y, v.z);
            v.addScaledVector(this.angularVelocity, dt);
            this.mesh.rotation.set(v.x, v.y, v.z);
        }
    }


    function init() {

        //window.addEventListener( 'resize', onWindowResize, false );

        groundTex = loadTexture(0, true, 3, 3);
        earthTex = loadTexture(1);
        compassTex1 = loadTexture(2);
        compassTex2 = loadTexture(3, true, -1);
        //compassTex2.flipX=true;
        compassTex2.wrapS = THREE.RepeatWrapping;
        compassTex2.repeat.x = -1
        // renderer
        renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
        // renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMapSoft = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.physicallyBasedShading = true;

        //document.body.appendChild( renderer.domElement );

        // scene
        scene = new THREE.Scene();
        scene.background = bgColor;

        // camera
        camera = new THREE.PerspectiveCamera(30, canvas.width / canvas.height, 1, 30);
        camera.position.set(0, 0, 5);


        // controls
        orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
        orbitControls.zoomSpeed = 0.33;
        // ambient
        scene.add(new THREE.AmbientLight(0x222222));

        // light
        let light = new THREE.DirectionalLight(0xaaaaaa, 1);
        light.position.set(1, 3, 2); //20,20,0
        //light.castShadow=true;

        light.shadow.camera.left = -2;
        light.shadow.camera.top = 2;
        light.shadow.camera.right = 2;
        light.shadow.camera.bottom = -2;
        light.shadow.camera.near = 1;
        light.shadow.camera.far = 5;
        light.shadow.bias = -0.005;

        //light.shadowBias = 2;
        //light.shadowMapWidth = light.shadowMapHeight = 2040;
        light.shadow.darkness = 1;
        //light.shadowCameraVisible = true;
        //scene.add( new THREE.DirectionalLight(light, 2.5) );
        scene.add(light);

        light = new THREE.DirectionalLight(0xaaaaaa, 1);
        light.position.set(-1, -3, -2); //20,20,0
        scene.add(light);

        // axes
        //scene.add( new THREE.AxesHelper( 20 ) );

        light = new THREE.PointLight(0xffffff, 0.65); // soft white light
        light.position.set(0, 0, 0);
        camera.add(light);
        scene.add(camera);


        const magnetGeom = new THREE.BoxGeometry(0.03, 0.1, 0.05);
        let magnetMat = new THREE.MeshPhongMaterial({
            color: 0xff0000,
        });
        magnet = new THREE.Group();

        let northPole = new THREE.Mesh(magnetGeom, magnetMat);
        northPole.position.set(0, -0.05, 0);
        magnetMat = new THREE.MeshPhongMaterial({
            color: 0x0000ff,
        });
        let southPole = new THREE.Mesh(magnetGeom, magnetMat);
        southPole.position.set(0, 0.05, 0);
        magnet.add(northPole);
        magnet.add(southPole);
        magnet.castShadow = false;
        magnet.rotation.set(0, 0, settings.declination * Math.PI / 180);


        // meridian=new THREE.Group();


        magMeridian = new THREE.Group();// meridianGeom, meridianMat );
        arrowNS = createArrow(new THREE.Vector3(0, -0.85, 0), new THREE.Vector3(0, 1, 0), 1.7, 0.01, magColor);//new THREE.ArrowHelper( new THREE.Vector3(0,1,0), new THREE.Vector3(0,-1,0),2, magColor,1.5*vField.arrowSize,vField.arrowSize);
        magnet.add(arrowNS);

        let MN_text = createText("M.N.", new THREE.Vector3(0, 1.75, 0), 0.06, magColor);
        arrowNS.add(MN_text);

        let MS_text = createText("M.S.", new THREE.Vector3(0, -0.05, 0), 0.06, magColor);
        //instance.rotation.set(Math.PI/2,0,Math.PI/2);
        arrowNS.add(MS_text);


        let circleGeometry = new THREE.TorusGeometry(0.498, 0.005, 10, 100);
        let circleMaterial = new THREE.MeshPhongMaterial({color: magColor});
        magCircle = new THREE.Mesh(circleGeometry, circleMaterial);
        magMeridian.add(magCircle);

        magnet.add(magMeridian);
        const compassGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.01, 30);
        const compassMat1 = new THREE.MeshPhongMaterial({
            map: compassTex1,
            color: 0xcccccc,
        });
        const compassMat2 = new THREE.MeshPhongMaterial({
            map: compassTex2,
            color: 0xcccccc,
        });
        const materials = [
            compassMat1,
            compassMat1,
            compassMat2
        ]
        compassH = new THREE.Mesh(compassGeom, materials);
        //compass.rotation.set(0,0,Math.PI/2);
        compassH.position.set(0, 0, 1);
        compassV = compassH.clone();
        magnet.add(compassH);
        magnet.add(compassV);


        field = new THREE.Group();
        magnet.add(field);

        meridianfield = new THREE.Group();
        magnet.add(meridianfield);
        //field.castShadow=true;

        const axesHelper = new THREE.AxesHelper(0.5);
        // scene.add( axesHelper );


        const earthGeom = new THREE.SphereGeometry(0.5, 40, 40);
        const earthMat = new THREE.MeshPhongMaterial({
            map: earthTex,
            color: 0xffffff,
            transparent: true,
            depthWrite: false,
            opacity: 0.8,
        });
        earth = new THREE.Mesh(earthGeom, earthMat);
        earth.physics = new BodyPhysics(earth);
        earth.physics.angularVelocity = new THREE.Vector3(0, 0.1, 0);
        // earth.renderOrder=1;
        // earth.castShadow=true;
        geogMeridian = new THREE.Group();
        earth.add(magnet);

        earth.add(geogMeridian);


        const arrowGNS = createArrow(new THREE.Vector3(0, -0.75, 0), new THREE.Vector3(0, 1, 0), 1.5, 0.012, geogColor);//geogColor,1.5*vField.arrowSize,vField.arrowSize);
        earth.add(arrowGNS);
        const arrowGEW = createArrow(new THREE.Vector3(-0.75, 0, 0), new THREE.Vector3(1, 0, 0), 1.5, 0.012, geogColor);//geogColor,1.5*vField.arrowSize,vField.arrowSize);
        earth.add(arrowGEW);

        let GN_text = createText("N", new THREE.Vector3(0, 0.8, 0), 0.06, geogColor);
        earth.add(GN_text);

        let GS_text = createText("S", new THREE.Vector3(0, -0.8, 0), 0.06, geogColor);
        earth.add(GS_text);

        let GE_text = createText("E", new THREE.Vector3(0.8, 0, 0), 0.06, geogColor);
        earth.add(GE_text);

        let GW_text = createText("W", new THREE.Vector3(-0.8, 0, 0), 0.06, geogColor);
        earth.add(GW_text);

        circleMaterial = new THREE.MeshPhongMaterial({color: geogColor});
        geogCircle = new THREE.Mesh(circleGeometry, circleMaterial);
        geogMeridian.add(geogCircle);

        scene.add(earth);

        //Ground
        const equatorGeo = new THREE.PlaneGeometry(3, 3);
        const equatorMat = new THREE.MeshPhongMaterial({
            map: groundTex,
            shininess: 0,
            color: 0xAAAABB,
            specular: 0x000000
            //side: THREE.DoubleSide,
        });

        let locationGeom = new THREE.SphereGeometry(0.015, 10, 10);
        let locationMat = new THREE.MeshPhongMaterial({
            // map:earthTex,
            color: 0xffff00,
            opacity: 1,
        });

        locationCompass = new THREE.Mesh(locationGeom, locationMat);
        locationCompass.position.set(0, 0, 1);
        magnet.add(locationCompass);
        magnet.add(compassH);

        equatorMat.color.setRGB(1.5, 1.5, 1.5);
        equator = new THREE.Mesh(equatorGeo, equatorMat);
        equator.rotation.x = -Math.PI / 2;


        renderer.sortObjects = true
        // renderer.depth=false;
        let draggables = [locationCompass];
        dragControls = new THREE.DragControls(draggables, camera, renderer.domElement);
        //  dragControls.transformGroup=true;
        dragControls.addEventListener("hoveron", function () {
            orbitControls.enabled = false;
        });
        dragControls.addEventListener("hoveroff", function () {
            orbitControls.enabled = true;
        });
        dragControls.addEventListener("drag", function () {
            updateMeridians();
        });
        updateParams();
        animate();

    }


    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);

    }

    function animate() {
        requestAnimationFrame(animate);
        //controls.update();
        if (settings.isRunning == true) {
            updatePhysics(0.02);//clock.getDelta()/1000);
        }
        renderer.render(scene, camera);
    }

    function updateMeridians() {
        vField.fieldColor = "#ffff00";
        vField.arrowLoc = 0;
        vField.useTube = true;
        vField.arrowColor = "#ffff00";
        let p = locationCompass.position.clone();
        p.setLength(0.5);
        locationCompass.position.set(p.x, p.y, p.z);
        compassH.position.set(p.x, p.y, p.z);
        if (settings.verticalCompass) p.setLength(0.6);
        compassV.position.set(p.x, p.y, p.z);

        //compass.clear();
        meridianfield.clear();
        p = magnet.localToWorld(p);
        p = earth.worldToLocal(p);
        let q = p.clone().sub(src1);
        let normal = p.clone().sub(src0).cross(q);
        let th = normal.angleTo(new THREE.Vector3(0, 0, 1));
        //console.log(th);
        if (p.z > 0) th = -th;
        geogMeridian.rotation.set(0, th, 0);
        //geogMeridian.quaternion.premultiply(earth.quaternion);


        p = locationCompass.position.clone();
        q = p.clone().sub(src1);
        normal = p.clone().sub(src0).cross(q);
        th = normal.angleTo(new THREE.Vector3(0, 0, 1));
        //console.log(th);
        if (p.z > 0) th = -th;
        magMeridian.rotation.set(0, th, 0);

        if (settings.showCompassField) {
            //Add field at compass location
            p = (settings.verticalCompass ? compassV : compassH).position.clone();
            //p=magnet.worldToLocal(p);
            let f1 = vField.createField(p, false);
            vField.arrowLoc = 0.5;
            vField.step = 0.01;
            vField.maxSteps = 500;
            p = (settings.verticalCompass ? compassV : compassH).position.clone();
            let f2 = vField.createField(p, true);
            meridianfield.add(f1);
            meridianfield.add(f2);
        }

        p = (settings.verticalCompass ? compassV : compassH).position.clone();
        //p=magnet.worldToLocal(p);
        let B = vField.fieldEvaluator(p);
        let dir = B.clone().normalize();

        let Bv = B.clone().projectOnVector(p);
        let Bh = B.clone().sub(Bv);

        if (settings.showCompassField) {
            //Add net Magnetic field vector
            let arrowB = new THREE.ArrowHelper(dir, p, B.length(), vField.arrowColor, 1.5 * vField.arrowSize, vField.arrowSize);
            arrowB.add(createText("B", new THREE.Vector3(0, B.length() + 0.05, 0), 0.06, '#ffffff'))
            meridianfield.add(arrowB);
            //Add vertical component
            dir = Bv.clone().normalize();
            const arrowBv = new THREE.ArrowHelper(dir, p, Bv.length(), '#ffffff', 1.5 * vField.arrowSize, vField.arrowSize);
            arrowBv.add(createText("Bv", new THREE.Vector3(0, Bv.length() + 0.05, 0), 0.06))
            meridianfield.add(arrowBv);
            //Add horizontal component
            dir = Bh.clone().normalize();
            const arrowBh = new THREE.ArrowHelper(dir, p, Bh.length(), '#ffffff', 1.5 * vField.arrowSize, vField.arrowSize);
            arrowBh.add(createText("Bh", new THREE.Vector3(0, Bh.length() + 0.05, 0), 0.06))
            meridianfield.add(arrowBh);
        }

        //Align compass
        if (settings.horizontalCompass) {
            p = compassH.position.clone();
            //p=magnet.worldToLocal(p);
            B = vField.fieldEvaluator(p);
            dir = B.clone().normalize();

            Bv = B.clone().projectOnVector(p);
            Bh = B.clone().sub(Bv);

            Bh.applyQuaternion(magnet.quaternion);
            Bh.applyQuaternion(earth.quaternion);
            compassH.up.set(Bh.x, Bh.y, Bh.z);
            compassH.lookAt(0, 0, 0);
            //compass.quaternion.premultiply(magnet.quaternion);
            compassH.rotateOnAxis(new THREE.Vector3(0, 0, -1), -Math.PI / 2);
            compassH.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        }
        if (settings.verticalCompass) {
            p = compassH.position.clone();
            //p=magnet.worldToLocal(p);
            B = vField.fieldEvaluator(p);
            dir = B.clone().normalize();

            Bv = B.clone().projectOnVector(p);
            Bh = B.clone().sub(Bv);
            Bh.applyQuaternion(magnet.quaternion);
            Bh.applyQuaternion(earth.quaternion);
            compassV.up.set(Bh.x, Bh.y, Bh.z);
            compassV.lookAt(0, 0, 0);
            //compass.rotation.set(0,th,0);
            th = Math.atan2(Bv.length(), Bh.length());
            if (Bv.dot(p) < 0) th = -th;
            compassV.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.PI / 2);
            compassV.rotateOnAxis(new THREE.Vector3(0, 1, 0), th);
            //compass.quaternion.premultiply(magnet.quaternion);
        }


    }

    function updateParams() {
        earth.material.opacity = settings.earthOpacity;
        magMeridian.visible = settings.showMeridian;
        geogMeridian.visible = settings.showMeridian;
        arrowNS.visible = settings.showMeridian;
        compassH.visible = settings.horizontalCompass;
        compassV.visible = settings.verticalCompass;
        magnet.rotation.set(0, 0, settings.declination * Math.PI / 180);

        updateField();
        updateMeridians();
    }

    function updateField() {

        let I = settings.intensity;
        field.clear();
        if (I == 0) return;
        let N = 40 * (I);

        vField.fieldColor = "#ffffff";
        vField.arrowLoc = 0.3;
        vField.step = 0.1;
        vField.maxSteps = 200;
        vField.useTube = false;
        //vField.arrowColor="#ffffaa";
        // wire.physics.angularVelocity.set(0,2*B,0);
        //create field

        if (N == 0) return;
        //field.add(vField.createField(new THREE.Vector3(0,0.2,0),false));
        //field.add(vField.createField(new THREE.Vector3(0,-0.2,0),true));
        let fields = new THREE.Group();
        // field.add(vField.createField(new THREE.Vector3(0.0,src0.y+0.05,0.0),true));
        //field.add(vField.createField(new THREE.Vector3(0.0,src1.y-0.05,0.0),false));

        // fields.add(vField.createField(new THREE.Vector3(0.01,0.15,0.01),false));
        fields.add(vField.createField(new THREE.Vector3(0.01, src0.y + 0.05, 0.01), true));
        let f = vField.createField(new THREE.Vector3(0.02, src0.y + 0.05, 0.02), true);
        //f.rotation.set(0,Math.PI/N,0);
        fields.add(f);
        // fields.add(vField.createField(new THREE.Vector3(0.01,-0.15,0.02),true));
        // f=vField.createField(new THREE.Vector3(0.03,-0.15,0.03),true);
        // f.rotation.set(0,Math.PI/N,0);
        // fields.add(f);

        for (let i = 0; i <= N; i++) {
            field.add(fields);
            fields = fields.clone();
            fields.rotation.set(0, 2 * i * Math.PI / N, 0);
        }
    }

    function updatePhysics(dt) {
        earth.physics.update(dt);
    }


    /**
     * @param field
     * @param options {minBounds, maxBounds,arrowLoc (0 to 1), arrowSize, stopPoints (array),fieldColor, arrowColor}
     * @constructor
     */
    function VectorField(fieldEvaluator, options) {
        this.minBounds = new THREE.Vector3(-2, -3, -2);
        this.maxBounds = new THREE.Vector3(2, 3, 2);
        this.arrowLoc = 0.35;
        this.arrowSize = 0.03;
        this.maxSteps = 50;
        this.stopPoints = [];
        this.fieldColor = "#ffffff";
        this.arrowColor = "#ffffff";
        this.min = 1E-12;
        this.max = 1E12;
        this.step = 0.5;
        this.useTube = false;
        /**
         * returns field vector at point p
         */
        this.fieldEvaluator = function (p) {
            let factor = 0.7;
            let AP = p.clone().sub(src0);
            let BP = p.clone().sub(src1);

            let d1 = AP.length();
            let d2 = BP.length();

            AP = AP.multiplyScalar(factor / (d1 * d1 * d1));
            BP = BP.multiplyScalar(factor / (d2 * d2 * d2));

            BP = BP.sub(AP);
            // console.log(p);
            //console.log(AP);
            return BP;
        }
        if (options) {
            if (options.minBounds) this.minBounds = options.minBounds;
            if (options.maxBounds) this.maxBounds = options.maxBounds;
            if (options.arrowLoc) this.arrowLoc = options.arrowLoc;
            if (options.arrowSize) this.arrowSize = options.arrowSize;
            if (options.maxSteps) this.maxSteps = options.maxSteps;
            if (options.fieldColor) this.fieldColor = options.fieldColor;
            if (options.arrowColor) this.arrowColor = options.arrowColor;
            if (options.stopPoints) this.stopPoints = options.stopPoints;
            if (options.fieldEvaluator) this.fieldEvaluator = options.fieldEvaluator;
            if (options.min) this.min = options.min;
            if (options.max) this.max = options.max;
            if (options.step) this.step = options.step;
        }

        this.addStopPoints = function (p) {
            this.stopPoints[this.stopPoints.length] = p;
        }

        this.getFieldAt = function (p) {
            return this.fieldEvaluator(p);
        }

        this.createField = function (pt, moveAgainstField, opacity) {
            let vertices = [];
            let dir = this.fieldEvaluator(pt).normalize();
            let prevDir = new THREE.Vector3();
            prevDir.set(dir.x, dir.y, dir.z);
            if (!dir) return;
            vertices[vertices.length] = pt;
            let p = pt.clone();
            let k = moveAgainstField ? -1 : 1;
            let n = 0;
            outer:
                while (n < this.maxSteps) {
                    if (!dir) break;
                    let E = dir.normalize();
                    //avoid abrupt change in field
                    if (dir.dot(prevDir) < -0.5) break;
                    prevDir.set(dir.x, dir.y, dir.z);
                    if (E < this.min || E > this.max) break;
                    dir = dir.multiplyScalar(k * this.step);
                    p.add(dir);
                    if (!withinBounds(p, this.minBounds, this.maxBounds)) break;

                    if (p.distanceTo(pt) < this.step / 2) {
                        vertices[vertices.length] = new THREE.Vector3(pt.x, pt.y, pt.z);
                        break;
                    }
                    for (let i = 0; i < this.stopPoints.length; i++) {
                        let stopPoint = this.stopPoints[i];
                        if (p.distanceTo(stopPoint) < step / 2) {
                            vertices[vertices.length] = new THREE.Vector3(stopPoint.x, stopPoint.y, stopPoint.z);
                            break outer;
                        }
                    }

                    vertices[vertices.length] = new THREE.Vector3(p.x, p.y, p.z);
                    dir = this.fieldEvaluator(p);
                    n++;
                }
            //console.log(vertices);
            if (vertices.length < 2) return;
            let curve = new THREE.CatmullRomCurve3(vertices);
            let geometry;
            let material;
            let curveObject;
            if (this.useTube) {
                geometry = new THREE.TubeGeometry(curve, 40, this.arrowSize / 5, 5);
                material = new THREE.MeshPhongMaterial({
                    color: this.fieldColor,
                });
                curveObject = new THREE.Mesh(geometry, material);
            } else {
                let points = curve.getPoints(50);
                geometry = new THREE.BufferGeometry().setFromPoints(points);
                material = new THREE.LineBasicMaterial({color: this.fieldColor, linewidth: 4});
                curveObject = new THREE.Line(geometry, material);
                //material = new MeshLineMaterial({
                //  lineWidth:2.5,
                // color:this.fieldColor
                //});
                //const line = new MeshLine();
                // line.setPoints(points);
                // curveObject = new THREE.Line(geometry, material);
            }

            let ap1 = curve.getPoint(this.arrowLoc);
            //let ap2=curve.getPoint(this.arrowLoc+this.arrowSize);
            dir = this.fieldEvaluator(ap1).normalize();
            const arrowHelper = new THREE.ArrowHelper(dir, ap1, this.arrowSize, this.arrowColor, 1.5 * this.arrowSize, this.arrowSize);
            curveObject.add(arrowHelper);

            if (opacity) material.opacity = opacity;
            return curveObject;
        }

        function withinBounds(p, minBounds, maxBounds) {
            if (p.x < minBounds.x || p.y < minBounds.y || p.z < minBounds.z ||
                p.x > maxBounds.x || p.y > maxBounds.y || p.z > maxBounds.z) return false;
            return true;
        }
    }

    function createArrow(start, dir, length, thickness, color) {
        let cylinderGeom = new THREE.CylinderGeometry(thickness / 2, thickness / 2, length - thickness * 2, 12);
        let headGeom = new THREE.ConeGeometry(thickness * 1.5, thickness * 4, 12);
        let material = new THREE.MeshPhongMaterial({
            color: color,
        });
        let cylinder = new THREE.Mesh(cylinderGeom, material);
        cylinder.position.set(0, length / 2 - thickness, 0);
        let head = new THREE.Mesh(headGeom, material);

        head.position.set(0, length - thickness * 2, 0);
        let arrow = new THREE.Group();
        arrow.add(cylinder);
        arrow.add(head);
        let axis = new THREE.Vector3(0, 1, 0);
        arrow.quaternion.setFromUnitVectors(axis, dir.clone().normalize());
        arrow.position.set(start.x, start.y, start.z);
        return arrow;
    }


    function createText(text, pos, size, color) {
        if (!color) color = "#ffffff";
        if (!size) size = 0.1;

        let textSprite = new THREE.Group();//THREE.TextGeometry( text, {size:0.1,height:0.02} );

        textSprite.position.set(pos.x, pos.y, pos.z);
        return textSprite;
    }

    return initialize;
}