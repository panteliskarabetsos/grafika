let gl;
let program;
let uModelMatrix;
let vertexBuffer;
let aPosition;
let uColor;
let animationInterval = null;
let angle = 0;
let height = 40;


window.onload = function () {
  const canvas = document.getElementById('glcanvas'); // Επιλογή του καμβά
 gl = canvas.getContext('webgl', { depth: true }); //ενεργοποίηση WebGL
  if (!gl) {
    alert("WebGL not supported");
    return;
  }

  // Ορισμός του χρώματος φόντου (σκούρο γκρι)
  gl.clearColor(0.0, 0.0, 0.0, 0.4);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Ορισμός κορυφών και χρωμάτων
  const {vertices, colors} = getCubeData();

  // Δημιουργία shader προγράμματος
    const vertexShaderSource = `
      attribute vec3 aPosition;
     uniform vec3 uColor;
     varying vec3 vColor;  

      uniform mat4 uProjectionMatrix;
      uniform mat4 uViewMatrix;
      uniform mat4 uModelMatrix;

      void main(void) {
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
        vColor = uColor;
      }
    `;

  const fragmentShaderSource = `
    precision mediump float;
    varying vec3 vColor;
    void main(void) {
      gl_FragColor = vec4(vColor, 1.0);
    }
  `;

   program = createShaderProgram(vertexShaderSource, fragmentShaderSource);
  gl.useProgram(program);

 uModelMatrix = gl.getUniformLocation(program, "uModelMatrix");
 uColor = gl.getUniformLocation(program, "uColor");

  document.getElementById("redrawBtn").addEventListener("click", () => {
  redrawCamera(program);
  });

  // Δημιουργία των πινάκων
  const viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, [8, 8, 8], [0, 0, 0], [0, 0, 1]);

  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, glMatrix.toRadian(60), 1.0, 0.001, 8000);

  // Σύνδεση με τους uniforms στον shader
  const uViewMatrix = gl.getUniformLocation(program, 'uViewMatrix');
  const uProjectionMatrix = gl.getUniformLocation(program, 'uProjectionMatrix');
  gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
  gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);

  // Vertex buffer
  vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  aPosition = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);

  // Σχεδίαση
// Σχεδίαση με βάση τα default inputs
redrawCamera(program);

};

// Δημιουργία κύβου και χρωμάτων
function getCubeData() {
  const vertices = [];
  const colors = [];

  // Βοηθητική για χρώμα
  function pushFace(v, color) {
    vertices.push(...v);
    for (let i = 0; i < 6; i++) colors.push(...color);
  }

  // Όψεις (6 × 2 τρίγωνα = 12 τρίγωνα = 36 κορυφές)
  pushFace([
    -0.5, -0.5,  0.5, // κάτω αριστερά
     0.5, -0.5,  0.5,   // κάτω δεξιά
     0.5,  0.5,  0.5, // πάνω δεξιά

    -0.5, -0.5,  0.5, // κάτω αριστερά (ξανά)
     0.5,  0.5,  0.5, // πάνω δεξιά
    -0.5,  0.5,  0.5 // πάνω αριστερά

  ], [1.0, 0.0, 0.0]); // Μπροστά – Κόκκινο

  pushFace([
    -0.5, -0.5, -0.5, 
    -0.5,  0.5, -0.5,  
     0.5,  0.5, -0.5,

    -0.5, -0.5, -0.5, 
     0.5,  0.5, -0.5, 
     0.5, -0.5, -0.5

  ], [0.0, 1.0, 0.0]); // Πίσω 

  pushFace([
    -0.5,  0.5, -0.5, -0.5,  0.5,  0.5,  0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5,  0.5, -0.5
  ], [0.0, 0.0, 1.0]); // Πάνω

  pushFace([
    -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5,
    -0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,  0.5
  ], [1.0, 1.0, 0.0]); // Κάτω 

  pushFace([
     0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,
     0.5, -0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5
  ], [0.0, 1.0, 1.0]); // Δεξιά 

  pushFace([
    -0.5, -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5,
    -0.5, -0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5
  ], [1.0, 0.0, 1.0]); // Αριστερά 

  return {vertices, colors};
}

// Shader compiler
function createShaderProgram(vsSource, fsSource) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vsSource);
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSource);
  gl.compileShader(fs);

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return program;
}

function redrawCamera(program) {
  const viewAngleDeg = parseFloat(document.getElementById("viewAngle").value);
  const camOrthoDistance = parseFloat(document.getElementById("camOrthoDistance").value);
  const selectedPosition = document.querySelector("input[name='cameraPos']:checked").value;

  // Υπολογισμός θέσης κάμερας σύμφωνα με το λεκτικό
  const dirs = {
    "Left-Front-Top":    [-1, -1,  1],
    "Left-Front-Bottom": [-1, -1, -1],
    "Left-Back-Top":     [-1,  1,  1],
    "Left-Back-Bottom":  [-1,  1, -1],
    "Right-Front-Top":   [ 1, -1,  1],
    "Right-Front-Bottom":[ 1, -1, -1],
    "Right-Back-Top":    [ 1,  1,  1],
    "Right-Back-Bottom": [ 1,  1, -1]
  };

  const dir = dirs[selectedPosition];
  const cameraPos = [
    dir[0] * camOrthoDistance,
    dir[1] * camOrthoDistance,
    dir[2] * camOrthoDistance
  ];

  // Νέοι πίνακες προβολής
  const viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, cameraPos, [0, 0, 0], [0, 0, 1]);

  const projectionMatrix = mat4.create();
  const canvas = document.getElementById("glcanvas");
  const aspect = canvas.width / canvas.height;
  const zFar = camOrthoDistance * 10;
  mat4.perspective(projectionMatrix, glMatrix.toRadian(viewAngleDeg), aspect, 0.001, zFar);

  // Ανανέωση των uniforms
  const uViewMatrix = gl.getUniformLocation(program, "uViewMatrix");
  const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
  gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
  gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);

  // Ανασχεδίαση
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  drawRobot(uModelMatrix, program,uColor); //Επανασχεδιάζει το ρομπότ μετά από αλλαγή κάμερας
  console.log("View Angle (deg):", viewAngleDeg);
}

function drawCube(scaleVec, translateVec, color, uModelMatrix, program, uColor) {

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);
  const modelMatrix = mat4.create();
  mat4.translate(modelMatrix, modelMatrix, translateVec);
  mat4.scale(modelMatrix, modelMatrix, scaleVec);
  gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);

  gl.uniform3fv(uColor, color);
  gl.drawArrays(gl.TRIANGLES, 0, 36);

}

function drawRobot(uModelMatrix,program,uColor) {
  // Πατούσες (κόκκινο)
  drawCube([4, 6, 2], [-3, -1, 5], [0.7, 0.2, 0.2], uModelMatrix,program,uColor);
  drawCube([4, 6, 2], [ 3, -1, 5], [0.7, 0.2, 0.2], uModelMatrix,program,uColor);

  // Πόδια (κίτρινο)
  drawCube([4, 4, 10], [-3, 0, 11], [0.9, 0.9, 0.1],uModelMatrix,program,uColor);
  drawCube([4, 4, 10], [ 3, 0, 11], [0.9, 0.9, 0.1],uModelMatrix,program,uColor);

  // Κορμός (κόκκινο)
  drawCube([10, 6, 12], [0, 0, 22], [0.7, 0.2, 0.2],uModelMatrix,program,uColor);

  // Χέρια (κίτρινο)
  drawCube([2, 4, 10], [-6, 0, 23], [0.9, 0.9, 0.1],uModelMatrix,program,uColor);
  drawCube([2, 4, 10], [ 6, 0, 23], [0.9, 0.9, 0.1],uModelMatrix,program,uColor);

  // Κεφάλι (κίτρινο)
  drawCube([6, 4, 5], [0, 0, 30], [0.9, 0.9, 0.1],uModelMatrix,program,uColor);
  //       [πλάτος,βάθος,ύψος],[θέση κύβου],[χρώμα]
    drawGrid(program);
}

function drawGrid(program) {
  const lines = [];
  const color = [0.6, 0.6, 0.6]; // Γκρι

  for (let i = -100; i <= 100; i += 10) {
    // Κάθετες γραμμές
    lines.push(i, -100, 0);  // από κάτω
    lines.push(i,  100, 0);  // προς τα πάνω

    // Οριζόντιες γραμμές
    lines.push(-100, i, 0);  // από αριστερά
    lines.push( 100, i, 0);  // προς τα δεξιά
  }

  const gridBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, 'aPosition');
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);

  gl.uniform3fv(uColor, color);
  const modelMatrix = mat4.create();
  gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);

  gl.drawArrays(gl.LINES, 0, lines.length / 3);
}

function updateCameraSpiral(program) {
  const camOrthoDistance = parseFloat(document.getElementById("camOrthoDistance").value);

  const radius = camOrthoDistance;
  const speed = 0.02; // ταχύτητα περιστροφής
  const verticalAmplitude = 10; // πόσο θα ανεβοκατεβαίνει

  angle += speed;
  const eyeX = radius * Math.cos(angle);
  const eyeY = radius * Math.sin(angle);
  const eyeZ = height + verticalAmplitude * Math.sin(angle * 0.5); // σπειροειδές

  const viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, [eyeX, eyeY, eyeZ], [0, 0, 0], [0, 0, 1]);

  const projectionMatrix = mat4.create();
  const canvas = document.getElementById("glcanvas");
  const aspect = canvas.width / canvas.height;
  const viewAngleDeg = parseFloat(document.getElementById("viewAngle").value);
  mat4.perspective(projectionMatrix, glMatrix.toRadian(viewAngleDeg), aspect, 0.001, 8000);

  // Ενημέρωση uniform
  const uViewMatrix = gl.getUniformLocation(program, "uViewMatrix");
  const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
  gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
  gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);

  // Ανασχεδίαση
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  drawRobot(uModelMatrix, program, uColor);
}



function startCameraAnimation(program) {
  if (!animationInterval) {
    animationInterval = setInterval(() => {
      updateCameraSpiral(program);
    }, 30); // 30ms ~ 33fps
  }
}

function stopCameraAnimation() {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }
}
