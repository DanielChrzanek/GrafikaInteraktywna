import {
    CLEAR_COLOR,
    AXES,
    CAMERA,
    LIGHT,
    UI,
    MODELS
} from './constants.js';

// Konfiguracja WebGL

const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl');
gl.viewport(0, 0, canvas.width, canvas.height);
gl.enable(gl.DEPTH_TEST);
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// Modele

const vsSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uModelViewProjection;
uniform mat4 uModel;
uniform mat3 uNormalMatrix;
varying vec3 vNormal;
varying vec3 vFragPos;

void main(){
  vec4 worldPos = uModel * vec4(aPosition,1.0);
  vFragPos = worldPos.xyz;
  vNormal = normalize(uNormalMatrix * aNormal);
  gl_Position = uModelViewProjection * vec4(aPosition,1.0);
}`;

const fsSource = `
precision mediump float;

uniform vec3 uLightPos;
uniform vec3 uViewPos;
uniform vec3 uColor;
uniform bool uLightInside;

varying vec3 vNormal;
varying vec3 vFragPos;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPos - vFragPos);

    float ndotl = dot(normal, lightDir);

    // two-sided lighting tylko gdy potrzeba
    if (uLightInside && ndotl < 0.0) {
        normal = -normal;
        ndotl = -ndotl;
    }

    float diff = max(ndotl, 0.0);

    vec3 ambient = 0.1 * uColor;
    vec3 diffuse = diff * uColor;

    vec3 viewDir = normalize(uViewPos - vFragPos);
    vec3 reflectDir = reflect(-lightDir, normal);

    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3 specular = spec * vec3(1.0);

    vec3 color = ambient + diffuse + specular;

    gl_FragColor = vec4(color, 1.0);
}`;

// Tworzenie modeli

function createSphere(r, uSeg, vSeg) {
    const vertices = [], indices = [];

    for (let v = 0; v <= vSeg; v++) {
        const phi = -Math.PI / 2 + v / vSeg * Math.PI;
        for (let u = 0; u <= uSeg; u++) {
            const theta = u / uSeg * 2 * Math.PI;
            vertices.push(r * Math.cos(theta) * Math.cos(phi), r * Math.sin(theta) * Math.cos(phi), r * Math.sin(phi));
        }
    }

    for (let v = 0; v < vSeg; v++) {
        for (let u = 0; u < uSeg; u++) {
            const i0 = v * (uSeg + 1) + u, i1 = i0 + 1, i2 = i0 + (uSeg + 1), i3 = i2 + 1;
            indices.push(i0, i2, i1, i1, i2, i3);
        }
    }

    return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

function createCone(r, h, uSeg, vSeg) {
    const vertices = [], indices = [];

    for (let v = 0; v <= vSeg; v++) {
        const vv = v / vSeg;
        for (let u = 0; u <= uSeg; u++) {
            const phi = u / uSeg * 2 * Math.PI;
            vertices.push(r * (1 - vv) * Math.cos(phi), r * (1 - vv) * Math.sin(phi), vv * h);
        }
    }

    for (let v = 0; v < vSeg; v++) {
        for (let u = 0; u < uSeg; u++) {
            const i0 = v * (uSeg + 1) + u, i1 = i0 + 1, i2 = i0 + (uSeg + 1), i3 = i2 + 1;
            indices.push(i0, i2, i1, i1, i2, i3);
        }
    }

    return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

function createCylinder(r, h, uSeg, vSeg) {
    const vertices = [], indices = [];

    for (let v = 0; v <= vSeg; v++) {
        const z = -h / 2 + v / vSeg * h;
        for (let u = 0; u <= uSeg; u++) {
            const phi = u / uSeg * 2 * Math.PI; vertices.push(r * Math.cos(phi), r * Math.sin(phi), z);
        }
    }
    
    for (let v = 0; v < vSeg; v++) {
        for (let u = 0; u < uSeg; u++) {
            const i0 = v * (uSeg + 1) + u, i1 = i0 + 1, i2 = i0 + (uSeg + 1), i3 = i2 + 1; indices.push(i0, i2, i1, i1, i2, i3);
        }
    }

    return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

function createCuboid(size) {
    const s = size / 2;
    const vertices = new Float32Array([-s, -s, -s, s, -s, -s, s, s,
        -s, -s, s, -s, -s, -s, s, s,
        -s, s, s, s, s, -s, s, s]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6,
        4, 6, 7, 0, 4, 7, 0, 7, 3,
        1, 5, 6, 1, 6, 2, 3, 2, 6,
        3, 6, 7, 0, 1, 5, 0, 5, 4]);

    return { vertices, indices };
}

function addModel(type) {
    let obj;
    if (type === 'sphere') {
        obj = initBuffers(createSphere(MODELS.DEFAULT_SPHERE_R, MODELS.DEFAULE_SPHERE_V, MODELS.DEFAULT_SPHERE_U));
        sphereCount++;
    } else if (type === 'cone') {
        obj = initBuffers(createCone(MODELS.DEFAULT_CONE_R, MODELS.DEFAULT_CONE_H,
            MODELS.DEFAULT_CONE_U, MODELS.DEFAULT_CONE_V));
        coneCount++;
    } else if (type === 'cylinder') {
        obj = initBuffers(createCylinder(MODELS.DEFAULT_CYLINDER_R, MODELS.DEFAULT_CYLINDER_H, 
            MODELS.DEFAULT_CYLINDER_U, MODELS.DEFAULT_CYLINDER_V));
        cylinderCount++;
    } else if (type === 'cuboid') {
        obj = initBuffers(createCuboid(MODELS.DEFAULT_CUBOID_SIZE));
        cuboidCount++;
    }

    const count =
        type === 'sphere' ? sphereCount :
            type === 'cone' ? coneCount :
                type === 'cylinder' ? cylinderCount :
                    cuboidCount;

    const model = {
        type,
        name: `${type} #${count}`,
        count,
        obj,
        localPos: [0, 0, 0],
        pos: [0, 0, 0],
        scale: [1, 1, 1],
        color: [Math.random(), Math.random(), Math.random()],
        orbitPoint: [0, 0, 0],
        orbitTarget: null,
        orbitSpeed: 0
    };

    modelObjects.push(model);

    // Tworzenie diva dla menu i PPM na scenie
    // To drugie nie działa do końca dobrze TODO
    // Bo jak się włącza menu na scenie, to div z menu znika

    const div = document.createElement('div');
    div.className = 'model-controls';
    div.style.borderBottom = '1px solid #ccc';
    div.style.padding = '2px 0';
    model.controlDiv = div;

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '2px';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = model.name;
    nameInput.style.fontSize = '12px';
    nameInput.style.width = '100px';
    nameInput.addEventListener('input', e => {
        model.name = e.target.value;
        refreshAllOrbitSelects();
    });
    header.appendChild(nameInput);

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '+';
    toggleBtn.style.width = '20px';
    toggleBtn.style.height = '20px';
    toggleBtn.style.fontSize = '12px';
    header.appendChild(toggleBtn);

    div.appendChild(header);

    const panel = document.createElement('div');
    panel.style.display = 'none';
    panel.style.marginTop = '2px';
    div.appendChild(panel);

    toggleBtn.addEventListener('click', () => {
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            toggleBtn.textContent = '-';
        } else {
            panel.style.display = 'none';
            toggleBtn.textContent = '+';
        }
    });

    const axisGroup = document.createElement('div');
    axisGroup.className = 'control-group';
    axisGroup.style.display = 'flex';
    axisGroup.style.gap = '2px';
    axisGroup.style.alignItems = 'center';
    axisGroup.style.marginBottom = '2px';

    const axisLabel = document.createElement('span');
    axisLabel.textContent = 'Oś:';
    axisLabel.style.fontSize = '11px';
    axisGroup.appendChild(axisLabel);

    const axisSelect = document.createElement('select');
    ['X', 'Y', 'Z'].forEach(ax => {
        const opt = document.createElement('option');
        opt.value = ax;
        opt.textContent = ax;
        axisSelect.appendChild(opt);
    });
    axisSelect.value = 'Z';
    axisSelect.addEventListener('change', e => {
        model.orbitAxis = e.target.value;
    });
    axisGroup.appendChild(axisSelect);
    panel.appendChild(axisGroup);

    model.orbitAxis = 'Z';

    function refreshAllOrbitSelects() {
        modelObjects.forEach(m => {
            if (!m.orbitSelect) return;
            const currentVal = m.orbitSelect.value;
            m.orbitSelect.innerHTML = '';

            const noneOption = document.createElement('option');
            noneOption.value = '';
            noneOption.textContent = 'punkt (pX,pY,pZ)';
            m.orbitSelect.appendChild(noneOption);

            modelObjects.forEach(mo => {
                if (mo !== m) {
                    const opt = document.createElement('option');
                    opt.value = `${mo.count}`;
                    opt.textContent = mo.name;
                    m.orbitSelect.appendChild(opt);
                }
            });

            if ([...m.orbitSelect.options].some(o => o.value === currentVal)) {
                m.orbitSelect.value = currentVal;
            } else {
                m.orbitSelect.value = '';
                m.orbitTarget = null;
            }
        });
    }

    function addInlineGroup(labelText, axes, values, callback) {
        const group = document.createElement('div');
        group.className = 'control-group';
        group.style.display = 'flex';
        group.style.gap = '2px';
        group.style.alignItems = 'center';
        group.style.marginBottom = '2px';

        const label = document.createElement('span');
        label.textContent = labelText;
        label.style.fontSize = '11px';
        group.appendChild(label);

        axes.forEach((axis, i) => {
            const input = document.createElement('input');
            input.type = 'number';
            input.step = '0.05';
            input.value = values[i];
            input.style.width = '40px';
            input.style.fontSize = '11px';
            input.addEventListener('input', e => callback(i, parseFloat(e.target.value) || 0));
            group.appendChild(input);
        });

        panel.appendChild(group);
    }

    addInlineGroup('Pozycja', ['X', 'Y', 'Z'], model.localPos, (i, v) => model.localPos[i] = v);
    addInlineGroup('Skala', ['Sx', 'Sy', 'Sz'], model.scale, (i, v) => model.scale[i] = v);
    addInlineGroup('Punkt P', ['pX', 'pY', 'pZ'], model.orbitPoint, (i, v) => model.orbitPoint[i] = v);


    const orbitGroup = document.createElement('div');
    orbitGroup.className = 'control-group';
    orbitGroup.style.display = 'flex';
    orbitGroup.style.gap = '2px';
    orbitGroup.style.alignItems = 'center';
    orbitGroup.style.marginBottom = '2px';

    const orbitLabel = document.createElement('span');
    orbitLabel.textContent = 'Orbita:';
    orbitLabel.style.fontSize = '11px';
    orbitGroup.appendChild(orbitLabel);

    const orbitSelect = document.createElement('select');
    model.orbitSelect = orbitSelect;
    orbitSelect.style.fontSize = '11px';
    refreshAllOrbitSelects();
    orbitSelect.addEventListener('change', e => {
        const val = e.target.value;
        model.orbitTarget = modelObjects.find(mo => `${mo.count}` === val) || null;
    });
    orbitGroup.appendChild(orbitSelect);
    panel.appendChild(orbitGroup);

    const speedGroup = document.createElement('div');
    speedGroup.className = 'control-group';
    speedGroup.style.display = 'flex';
    speedGroup.style.gap = '2px';
    speedGroup.style.alignItems = 'center';
    speedGroup.style.marginBottom = '2px';

    const speedLabel = document.createElement('span');
    speedLabel.textContent = 's:';
    speedLabel.style.fontSize = '11px';
    speedGroup.appendChild(speedLabel);

    const speedInput = document.createElement('input');
    speedInput.type = 'number';
    speedInput.step = '0.05';
    speedInput.value = model.orbitSpeed;
    speedInput.style.width = '40px';
    speedInput.style.fontSize = '11px';
    speedInput.addEventListener('input', e => model.orbitSpeed = parseFloat(e.target.value) || 0);
    speedGroup.appendChild(speedInput);
    panel.appendChild(speedGroup);


    const colorGroup = document.createElement('div');
    colorGroup.className = 'control-group';
    colorGroup.style.display = 'flex';
    colorGroup.style.gap = '2px';
    colorGroup.style.alignItems = 'center';
    colorGroup.style.marginBottom = '2px';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = '#' + model.color.map(c => Math.floor(c * 255).toString(16).padStart(2, '0')).join('');
    colorInput.addEventListener('input', e => {
        const hex = e.target.value;
        model.color = [
            parseInt(hex.slice(1, 3), 16) / 255,
            parseInt(hex.slice(3, 5), 16) / 255,
            parseInt(hex.slice(5, 7), 16) / 255
        ];
    });
    colorGroup.appendChild(colorInput);
    panel.appendChild(colorGroup);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Usuń';
    removeBtn.style.fontSize = '11px';
    removeBtn.addEventListener('click', () => {
        const idx = modelObjects.indexOf(model);
        if (idx !== -1) modelObjects.splice(idx, 1);
        div.remove();
    });
    panel.appendChild(removeBtn);

    modelListDiv.appendChild(div);
}

// Linie na modelach (wireframe)

const vsWire = `
attribute vec3 aPosition;
uniform mat4 uModelViewProjection;
void main() {
gl_Position=uModelViewProjection*vec4(aPosition,1.0);}
`;

const fsWire = `
precision mediump float;
uniform vec4 uColor;
void main() {
gl_FragColor=uColor;
}`;

const programWire = createProgram(gl, vsWire, fsWire);
const aPositionWire = gl.getAttribLocation(programWire, 'aPosition');
const uMVPWire = gl.getUniformLocation(programWire, 'uModelViewProjection');
const uColorWire = gl.getUniformLocation(programWire, 'uColor');

let showWireframe = true;
document.getElementById('wireframeToggle').addEventListener('change', e => { showWireframe = e.target.checked; });

// Osie na scenie

const vsAxes = `
attribute vec3 aPosition;
attribute vec4 aColor;
uniform mat4 uModelViewProjection;
varying vec4 vColor;
void main() {
    gl_Position = uModelViewProjection * vec4(aPosition,1.0);
    vColor = aColor;
}`;

const fsAxes = `
precision mediump float;
varying vec4 vColor;
void main() {
    gl_FragColor = vColor;
}`;
const programAxes = createProgram(gl, vsAxes, fsAxes);
const aPosAxes = gl.getAttribLocation(programAxes, 'aPosition');
const aColorAxes = gl.getAttribLocation(programAxes, 'aColor');
const uMVPAxes = gl.getUniformLocation(programAxes, 'uModelViewProjection');

const axesVertices = new Float32Array([
    0, 0, 0, AXES.LENGTH, 0, 0,
    0, 0, 0, 0, AXES.LENGTH, 0,
    0, 0, 0, 0, 0, AXES.LENGTH
]);

const axesColors = [
    ...AXES.X_COLOR,
    ...AXES.Y_COLOR,
    ...AXES.Z_COLOR
];

const axesVB = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, axesVB);
gl.bufferData(gl.ARRAY_BUFFER, axesVertices, gl.STATIC_DRAW);

const axesCB = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, axesCB);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(axesColors), gl.STATIC_DRAW);

const axesIndices = new Uint16Array([0, 1, 2, 3, 4, 5]);
const axesIB = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, axesIB);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, axesIndices, gl.STATIC_DRAW);

let showAxes = true;
document.getElementById('showAxes').addEventListener('change', e => {
    showAxes = e.target.checked;
});

// Oświetlenie

function normalFromMat4(m) {
    const a = m;
    const m00 = a[0], m01 = a[1], m02 = a[2];
    const m10 = a[4], m11 = a[5], m12 = a[6];
    const m20 = a[8], m21 = a[9], m22 = a[10];

    return new Float32Array([
        m00, m01, m02,
        m10, m11, m12,
        m20, m21, m22
    ]);
}

let lightPosition = [0, 0, 0]; //[...LIGHT.DEFAULT_POSITION];

const lightX = document.getElementById('lightX');
const lightY = document.getElementById('lightY');
const lightZ = document.getElementById('lightZ');

let globalLightIntensity = LIGHT.DEFAULT_INTENSITY;
const minLightIntensity = LIGHT.MIN_INTENSITY;
const maxLightIntensity = LIGHT.MAX_INTENSITY;

const lightInput = document.getElementById('lightIntensityInput');

lightInput.addEventListener('input', e => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) val = LIGHT.DEFAULT_INTENSITY;
    globalLightIntensity = Math.min(Math.max(val, minLightIntensity), maxLightIntensity);
});

function updateLightPosition() {
    lightPosition[0] = parseFloat(lightX.value) || 0;
    lightPosition[1] = parseFloat(lightY.value) || 0;
    lightPosition[2] = parseFloat(lightZ.value) || 0;
}

[lightX, lightY, lightZ].forEach(input => {
    input.addEventListener('input', updateLightPosition);
});

let lightInsideModels = false;

document.getElementById('insideLightToggle')
    .addEventListener('change', e => {
        lightInsideModels = e.target.checked;
    });

// Obsługa kamery

let cameraDistance = CAMERA.START_DISTANCE;
let cameraTheta = CAMERA.START_THETA;
let cameraPhi = CAMERA.START_PHI;
let cameraTarget = [0, 0, 0], eye = [0, 0, 0];
let isDragging = false, lastX = 0, lastY = 0;

canvas.addEventListener('mousedown', e => { isDragging = true; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener('mouseup', () => { isDragging = false; });
canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;

    if (e.ctrlKey) {
        const panSpeed = CAMERA.PAN_SPEED_FACTOR * cameraDistance;
        const forward = normalize(subtract(cameraTarget, eye));
        const right = normalize(cross(forward, [0, 0, 1]));
        const up = cross(right, forward);
        cameraTarget[0] -= right[0] * dx * panSpeed;
        cameraTarget[1] -= right[1] * dx * panSpeed;
        cameraTarget[2] -= right[2] * dx * panSpeed;

        cameraTarget[0] += up[0] * dy * panSpeed;
        cameraTarget[1] += up[1] * dy * panSpeed;
        cameraTarget[2] += up[2] * dy * panSpeed;
    } else { 
        cameraTheta += dx * CAMERA.ROTATE_SPEED;
        cameraPhi -= dy * CAMERA.ROTATE_SPEED;
        const eps = 0.01;
        cameraPhi = Math.max(eps, Math.min(Math.PI - eps, cameraPhi));
    }

    lastX = e.clientX;
    lastY = e.clientY;
});

const maxZoomIn = CAMERA.MIN_ZOOM;
const maxZoomOut = CAMERA.MAX_ZOOM;
const zoomSpeed = CAMERA.ZOOM_SPEED;

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    cameraDistance += e.deltaY * zoomSpeed;
    cameraDistance = Math.max(maxZoomIn, Math.min(maxZoomOut, cameraDistance));
});

function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0];
}

function lookAt(eye, center, up) {
    const f = normalize(subtract(center, eye));
    const s = normalize(cross(f, up));
    const u = cross(s, f);
    return [s[0], u[0], -f[0], 0, s[1], u[1], -f[1], 0, s[2], u[2], -f[2], 0, -dot(s, eye), -dot(u, eye), dot(f, eye), 1];
}

// Tworzenie programu

function createShader(gl, type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);

    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
    }
    return s;
}

function createProgram(gl, vsSrc, fsSrc) {
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    const p = gl.createProgram();

    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);

    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(p));
        return null;
    }

    return p;
}
const program = createProgram(gl, vsSource, fsSource);
const aPosition = gl.getAttribLocation(program, 'aPosition');
const aNormal = gl.getAttribLocation(program, 'aNormal');
const uModelViewProjection = gl.getUniformLocation(program, 'uModelViewProjection');
const uModel = gl.getUniformLocation(program, 'uModel');
const uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix');
const uLightPos = gl.getUniformLocation(program, 'uLightPos');
const uViewPos = gl.getUniformLocation(program, 'uViewPos');
const uColor = gl.getUniformLocation(program, 'uColor');

const modelObjects = [];
const modelListDiv = document.getElementById('modelList');
let sphereCount = 0, coneCount = 0, cylinderCount = 0, cuboidCount = 0;

// Operacje na macierzach

function multiplyMatrices(a, b) {
    const out = new Array(16);

    for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
            out[j * 4 + i] = 0;
            for (let k = 0; k < 4; k++)
                out[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
        }
    return out;
}

function translationMatrix(x, y, z) {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
}

function subtract(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function normalize(v) {
    const l = Math.hypot(...v);
    return v.map(x => x / l);
}

function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function rotateModelAroundAxis(v, axis, angle) {
    const [x, y, z] = v;
    const [u, vv, w] = normalize(axis);

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    return [
        u * (u * x + vv * y + w * z) * (1 - cosA) + x * cosA + (-w * y + vv * z) * sinA,
        vv * (u * x + vv * y + w * z) * (1 - cosA) + y * cosA + (w * x - u * z) * sinA,
        w * (u * x + vv * y + w * z) * (1 - cosA) + z * cosA + (-vv * x + u * y) * sinA
    ];
}

function computeNormals(vertices, indices) {
    const normals = new Float32Array(vertices.length);

    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i] * 3, i1 = indices[i + 1] * 3, i2 = indices[i + 2] * 3;
        const v0 = [vertices[i0], vertices[i0 + 1], vertices[i0 + 2]];
        const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
        const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];
        const n = normalize(cross(
            [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]],
            [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]]
        ));

        for (const idx of [i0, i1, i2]) {
            normals[idx] += n[0];
            normals[idx + 1] += n[1];
            normals[idx + 2] += n[2];
        }
    }

    for (let i = 0; i < normals.length; i += 3) {
        const n = normalize([normals[i], normals[i + 1], normals[i + 2]]);
        normals[i] = n[0];
        normals[i + 1] = n[1];
        normals[i + 2] = n[2];
    }

    return normals;
}

function computeLineIndices(indices) {
    const lines = [];

    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i], i1 = indices[i + 1], i2 = indices[i + 2];
        lines.push(i0, i1, i1, i2, i2, i0);
    }

    return new Uint16Array(lines);
}

function initBuffers(obj) {
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, obj.vertices, gl.STATIC_DRAW);
    const nb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nb);
    gl.bufferData(gl.ARRAY_BUFFER, computeNormals(obj.vertices, obj.indices), gl.STATIC_DRAW);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, obj.indices, gl.STATIC_DRAW);
    const ibLine = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibLine);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, computeLineIndices(obj.indices), gl.STATIC_DRAW);

    return { vertices: obj.vertices, indices: obj.indices, vb, nb, ib, ibLine, lineCount: computeLineIndices(obj.indices).length };
}

// (Graficzny) Interfejs użytkownika

// Zapisywanie do pliku i wczytywanie z pliku

document.getElementById('saveScene').addEventListener('click', () => {
const data = {
    light: {
        position: [...lightPosition],
        inside: lightInsideModels,
        intensity: globalLightIntensity
    },
    models: modelObjects.map(m => ({
        type: m.type,
        name: m.name,
        localPos: m.localPos,
        pos: m.pos,
        scale: m.scale,
        color: m.color,
        orbitPoint: m.orbitPoint,
        orbitTargetCount: m.orbitTarget ? m.orbitTarget.count : null,
        orbitSpeed: m.orbitSpeed,
        orbitAxis: m.orbitAxis
    }))
};

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'scene.json';
    a.click();
    URL.revokeObjectURL(url);
});

const loadInput = document.getElementById('loadScene');
document.getElementById('loadSceneBtn').addEventListener('click', () => {
    loadInput.click();
});


loadInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = evt => {
        const scene = JSON.parse(evt.target.result);

        if (scene.light) {
            lightPosition = [...scene.light.position];

            lightX.value = lightPosition[0];
            lightY.value = lightPosition[1];
            lightZ.value = lightPosition[2];

            lightInsideModels = !!scene.light.inside;
            document.getElementById('insideLightToggle').checked = lightInsideModels;

            globalLightIntensity = scene.light.intensity ?? 1.0;
            document.getElementById('lightIntensityInput').value = globalLightIntensity;
        }

        // Resetowanie sceny    
    
        modelObjects.forEach(m => m.controlDiv.remove());
        modelObjects.length = 0;

        sphereCount = 0;
        coneCount = 0;
        cylinderCount = 0;
        cuboidCount = 0;

        // Ustawianie modeli

        scene.models.forEach(mdata => {
            addModel(mdata.type);

            const m = modelObjects[modelObjects.length - 1];

            m.name = mdata.name;
            const nameInput = m.controlDiv.querySelector('input[type="text"]');
            if (nameInput) nameInput.value = m.name;

            m.localPos = [...mdata.localPos];
            m.pos = [...mdata.pos];
            m.scale = [...mdata.scale];
            m.color = [...mdata.color];
            m.orbitPoint = [...mdata.orbitPoint];
            m.orbitSpeed = mdata.orbitSpeed;
            m.orbitTargetCount = mdata.orbitTargetCount;
            m.orbitAxis = mdata.orbitAxis || 'Z';

            const colorInput = m.controlDiv.querySelector('input[type="color"]');
            if (colorInput) {
                colorInput.value =
                    '#' + m.color
                        .map(c => Math.floor(c * 255).toString(16).padStart(2, '0'))
                        .join('');
            }

            const axisSelect = m.controlDiv.querySelector('select');
            if (axisSelect) axisSelect.value = m.orbitAxis;
        });

        // Ustawianie orbit (jeżeli model jest orbitą jakiegoś innego modelu)
        modelObjects.forEach(m => {
            if (m.orbitTargetCount !== null) {
                m.orbitTarget =
                    modelObjects.find(mo => mo.count === m.orbitTargetCount) || null;
            }
        });

        loadInput.value = '';
    };

    reader.readAsText(file);
});

// Obłsuga zmiany rozmiaru okna

function resizeCanvasAndUpdate() {
    const container = document.getElementById('canvas-container');
    const canvas = document.getElementById('glcanvas');

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    render();
}

resizeCanvasAndUpdate();

window.addEventListener('resize', resizeCanvasAndUpdate);

function worldToScreen(pos, mvp, width, height) {
    const [x, y, z] = pos;
    const clip = [
        mvp[0] * x + mvp[4] * y + mvp[8] * z + mvp[12],
        mvp[1] * x + mvp[5] * y + mvp[9] * z + mvp[13],
        mvp[3] * x + mvp[7] * y + mvp[11] * z + mvp[15]
    ];

    const ndcX = clip[0] / clip[2];
    const ndcY = clip[1] / clip[2];

    return [
        (ndcX * 0.5 + 0.5) * width,
        (-ndcY * 0.5 + 0.5) * height
    ];
}

let lastMVPs = new Map();

// Dodawanie modeli

document.getElementById('addSphere').addEventListener('click', () => addModel('sphere'));
document.getElementById('addCone').addEventListener('click', () => addModel('cone'));
document.getElementById('addCylinder').addEventListener('click', () => addModel('cylinder'));
document.getElementById('addCuboid').addEventListener('click', () => addModel('cuboid'));

// Funkcje do zapobiegania wyskakiwaniu okienek przy wciśnięciu PPM na scenie
// Służy to do pokazania menu TODO (które ostatecznie nie działa poprawnie XD)

window.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('mousedown', e => {
    if (e.button === 0) {
        contextMenu.style.display = 'none';
    }
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

// Menu kontekstowe 

canvas.addEventListener('mousedown', e => {
    if (e.button !== 2)
        return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let clickedModel = null;
    let minDist = UI.PICK_RADIUS;

    modelObjects.forEach(m => {
        const mvp = lastMVPs.get(m);
        if (!mvp) return;

        const [sx, sy] = worldToScreen(
            m.pos,
            mvp,
            canvas.width,
            canvas.height
        );

        const d = Math.hypot(mx - sx, my - sy);
        if (d < minDist) {
            minDist = d;
            clickedModel = m;
        }
    });

    if (clickedModel) {
        openContextMenu(clickedModel, e.clientX, e.clientY);
    }
});

const contextMenu = document.createElement('div');
contextMenu.style.position = 'fixed';
contextMenu.style.background = '#222';
contextMenu.style.border = '1px solid #555';
contextMenu.style.padding = '5px';
contextMenu.style.display = 'none';
contextMenu.style.zIndex = '1000';
document.body.appendChild(contextMenu);

contextMenu.addEventListener('mousedown', e => {
    e.stopPropagation();
});

function openContextMenu(model, x, y) {
    contextMenu.innerHTML = '';
    contextMenu.appendChild(model.controlDiv);

    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.style.display = 'block';
}

window.addEventListener('mousedown', e => {
    if (e.button === 0) {
        contextMenu.style.display = 'none';
    }
});

// Renderowanie sceny

function render() {
    const currentTime = performance.now() * 0.001;
    gl.clearColor(...CLEAR_COLOR);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Obsługa zmiany wymairów okna

    const aspect = canvas.width / canvas.height;
    const proj = perspective(Math.PI / 4, aspect, 0.1, 100);

    // Ustawienia kamery

    eye = [
        cameraTarget[0] + cameraDistance * Math.sin(cameraPhi) * Math.cos(cameraTheta),
        cameraTarget[1] + cameraDistance * Math.sin(cameraPhi) * Math.sin(cameraTheta),
        cameraTarget[2] + cameraDistance * Math.cos(cameraPhi)
    ];
    const view = lookAt(eye, cameraTarget, [0, 0, 1]);

    // Wyświetlenie modeli na scenie

    modelObjects.forEach(m => {

        // Jeżeli prędkość orbitowania jest różna od 0 to znaczy, że ma się poruszać
        // TODO dać chceckboxa do sprawdzenia czy ma się poruszać
        if (m.orbitSpeed !== 0) {
            const t = performance.now() * 0.001;
            const angle = t * m.orbitSpeed;

            const center = m.orbitTarget ? m.orbitTarget.pos : m.orbitPoint;

            const offset = [...m.localPos];
            if (offset.every(v => v === 0)) {
                offset[0] = 1;
            }

            const rotated = rotateModelAroundAxis(offset, [0, 0, 1], angle);

            m.pos = [
                center[0] + rotated[0],
                center[1] + rotated[1],
                center[2] + rotated[2]
            ];
        } else {
            const center = m.orbitTarget ? m.orbitTarget.pos : [0, 0, 0];
            m.pos = [
                center[0] + m.localPos[0],
                center[1] + m.localPos[1],
                center[2] + m.localPos[2]
            ];
        }

        function scalingMatrix(sx, sy, sz) {
            return [
                sx, 0, 0, 0,
                0, sy, 0, 0,
                0, 0, sz, 0,
                0, 0, 0, 1
            ];
        }

        const model = multiplyMatrices(translationMatrix(...m.pos), scalingMatrix(...m.scale));
        const mvp = multiplyMatrices(proj, multiplyMatrices(view, model));
        lastMVPs.set(m, mvp);

        gl.useProgram(program);
        const uLightInside = gl.getUniformLocation(program, 'uLightInside');
        gl.uniform1i(uLightInside, lightInsideModels ? 1 : 0);
        gl.uniformMatrix4fv(uModelViewProjection, false, new Float32Array(mvp));
        gl.uniformMatrix4fv(uModel, false, new Float32Array(model));
        gl.uniformMatrix3fv(uNormalMatrix, false, new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]));

        gl.uniformMatrix3fv(uNormalMatrix, false, normalFromMat4(model));
        gl.uniform3fv(uLightPos, lightPosition);
        gl.uniform3fv(uViewPos, eye);
        gl.uniform3fv(uColor, m.color.map(c => c * globalLightIntensity));
        gl.bindBuffer(gl.ARRAY_BUFFER, m.obj.vb);
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aPosition);
        gl.bindBuffer(gl.ARRAY_BUFFER, m.obj.nb);
        gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aNormal);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.obj.ib);
        gl.drawElements(gl.TRIANGLES, m.obj.indices.length, gl.UNSIGNED_SHORT, 0);

        if (showWireframe) {
            gl.useProgram(programWire);
            gl.uniformMatrix4fv(uMVPWire, false, new Float32Array(mvp));
            gl.uniform4fv(uColorWire, [1, 1, 1, 0.5]);
            gl.bindBuffer(gl.ARRAY_BUFFER, m.obj.vb);
            gl.vertexAttribPointer(aPositionWire, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aPositionWire);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.obj.ibLine);
            gl.drawElements(gl.LINES, m.obj.lineCount, gl.UNSIGNED_SHORT, 0);
        }

        if (showAxes) {
            gl.useProgram(programAxes);

            const mvpAxes = multiplyMatrices(proj, view);
            gl.uniformMatrix4fv(uMVPAxes, false, new Float32Array(mvpAxes));

            gl.bindBuffer(gl.ARRAY_BUFFER, axesVB);
            gl.vertexAttribPointer(aPosAxes, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aPosAxes);

            gl.bindBuffer(gl.ARRAY_BUFFER, axesCB);
            gl.vertexAttribPointer(aColorAxes, 4, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aColorAxes);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, axesIB);
            gl.drawElements(gl.LINES, axesIndices.length, gl.UNSIGNED_SHORT, 0);
        }
    });

    requestAnimationFrame(render);
}

render();