// ---------------------------------------------------------------- //
//  Kerning Pairs Visualizator
//  2005 Martin Bereciartua - email (at) m-i-b.com.ar
//  http://www.m-i-b.com.ar/
// ---------------------------------------------------------------- //
//
//  This source is released under the creative commons license
//  http://creativecommons.org/licenses/by-nc-sa/1.0/
//
//  Thanks to:
//  Ben Fry and Karsten Schmidt for inspiration
//
// ---------------------------------------------------------------- //
//  Made with Processing (Beta) v091
// ---------------------------------------------------------------- //

String poll_title = "";
String poll_subtitle = "NO CURRENT POLL";

PFont font, font1, font2, font3, font4;
int selected = -1;

int ticks = 0;
int total_ticks = 0;
int total_weight = 0;
float k_total;

int space_bottom;
int space_top;
int space_right;
int space_left;
String layout_actual = "standard";
String visual_mode = "lineal";
int max_displayed_balls = 49;
int displayed_balls_nb = 0;
int FRAME_RATE = 20;

Ball[] balls = new Ball[0];
float grav = 1.40;                    // Gravedad
float b = 0.85;                       // Rebote
float f = 0.90;                       // Friccion

color ColorLineasGrales = color(200);
color ColorAcento = color(255, 102, 0);
color ColorAcentoCompanion = color(255, 180, 0);

int refresh_frequency = 1;               // cada cuantos frames se renueva la info del listado
int refresh_timer = 0;
boolean resorte_activado = false;
boolean show_info = true;
boolean llenar_burbujas = false;
boolean hay_gravedad = false;

boolean stopped = true;


void setup() {
  frameRate(FRAME_RATE);

  size(800, 600);
  background(255);
  smooth();
  loop();

  font = loadFont("Swiss721BT-Bold-48.vlw");
  font1 = loadFont("Swiss721BT-BlackCondensed-25.vlw");
  font2 = loadFont("Swiss721BT-BoldCondensed-18.vlw");
  font3 = loadFont("Swiss721BT-BoldCondensed-14.vlw");
  font4 = loadFont("Swiss721BT-RomanCondensed-18.vlw");

  computeKtotal();

  layout( font1, font2, font3 );
}

void draw() {

    refresh_timer++;
    if ( refresh_timer == refresh_frequency ) {
        refresh_timer = 0;
        sortBalls();
    }

    if (!stopped) {
        if (ticks >= total_ticks) {
            models.Room.current().sendEV("PE");
            stopPoll();
        } else {
            ticks++;
        }
    }

    background(255);

    total_weight = 0;
    displayed_balls_nb = 0;
    for ( int i=max_displayed_balls; i>=0; i-- ) {
      if ( i < balls.length ) {
        total_weight += balls[i].weight;
        displayed_balls_nb++;
      }
    }

    computeKtotal();
    for ( int i=0; i<balls.length; i++ ) {
      float kprima = ( k_total * balls[i].weight ) / total_weight;
      balls[i].ka = kprima;
      balls[i].r = sqrt( ( ( kprima ) / PI ) );
    }

    for ( int i=max_displayed_balls; i>=0; i-- ) {
      if ( i < balls.length ) {
        if ( hay_gravedad ) balls[i].fall();
        if ( resorte_activado ) balls[i].spring();
        balls[i].bounce();
        balls[i].collide();
        balls[i].move();
        balls[i].encima();
        balls[i].display();
      }
    }

    layout( font1, font2, font3 );

}



void display_in_order() { // funcion para graficar los top 20

  float tamanio = 35;
  int altura = 200;
  int alpha_value = 255;

  for (int i=1; i < 20 && i < balls.length ; i++) {

    textFont(font, tamanio);
    textAlign(CENTER);
    fill(0, 102, 153, alpha_value);
    text(balls[i].nombre, width - 140, altura);

    tamanio = tamanio * 0.94;
    altura += tamanio+5;
    alpha_value -= 10;

  }

}

void layout( PFont font1, PFont font2, PFont font3 ) {

  if ( layout_actual == "standard" ) {

    space_bottom = 60;
    space_top = 15;
    space_right = 280;
    space_left = 15;

    rectMode(CORNERS);
    noStroke();
    fill(255);
    rect(width-space_right+5, 0, width, height);

    textFont(font, 48);
    textAlign(CENTER);
    fill(ColorAcento);
    if (balls.length > 0) {
        text(balls[0].nombre, width - 140, 155);
    }

    textFont(font3, 14);
    textAlign(CENTER);
    fill(180);

    display_in_order();

  } else if ( layout_actual == "reduced" ) {

    space_bottom = 60;
    space_top = 20;
    space_right = 20;
    space_left = 20;

  }

  textFont(font1, 25);
  textAlign(LEFT);
  fill(120);
  if (balls.length > 0) {
    text(str(total_weight - balls.length), space_left, height-30);
  }

  // titulos
  textFont(font2, 18);
  textAlign(RIGHT);
  text("]", width - space_right, height-31);
  fill(ColorAcento);
  text(poll_subtitle, width - space_right - textWidth("]"), height-31);
  fill(120);
  text("[", width - space_right - textWidth(poll_subtitle+"]"), height-31);
  float ancho_parcial = textWidth("["+poll_subtitle+"]");
  textFont(font2, 18);
  text(poll_title+" ", width - space_right - ancho_parcial, height-31);

  barraAvance( space_left, height - 25, width - space_right, height - 15,
                ticks, total_ticks, ColorLineasGrales, ColorAcento );

}

void startPoll(String title, String subtitle, int duration, String[] options) {
    stopped = false;
    balls = new Ball[0];
    ticks = 0;
    poll_title = title;
    poll_subtitle = subtitle;
    total_ticks = duration * FRAME_RATE;
    for ( int i=0; i<options.length; i++ ) {
        addNewOption(i, options[i]);
    }
}

void stopPoll() {
    stopped = true;
    poll_subtitle = "POLL FINISHED"
}

void addPollVote( int id ) {
  if (stopped) return;

  int kp_encontrado = 0;
  for (int i=0; i < balls.length; i++) {
    if ( balls[i].id == id ) {
      balls[i].weight++;
      break;
    }
  }

}

void addNewOption( int id, String newx ) {

  computeKtotal();
  float ka;
  if ( balls.length > 0 ) ka = k_total / balls.length;
  else ka = k_total;
  Ball[] tempBall = new Ball( id, ka, newx, 1 );
  balls[balls.length] = tempBall;

}

void sortBalls() {

  Ball[] temp_balls = new Ball[balls.length];
  temp_balls = balls;

  Ball temp;
  int i, j;
      for (i = temp_balls.length-1; i >= 0; i--)
         for (j = 0; j < i; j++)
            if (temp_balls[j].weight < temp_balls[j + 1].weight) {
               temp = temp_balls[j];
               temp_balls[j] = temp_balls[j + 1];
               temp_balls[j + 1] = temp;
            }

  balls = temp_balls;

}

void computeKtotal () {

  // encontrar un valor de k (superficie a ocupar) que concuerde con
  // la cantidad de burbujar a dibujar (evitar que se superpongan)

  float av_height = height-space_top-space_bottom;
  float av_width = width-space_left-space_right;

  if ( displayed_balls_nb <= 1 ) {
    if ( av_height < av_width ) k_total = PI*pow(av_height/2,2)*0.8;
    else k_total = PI*pow(av_width/2,2)*0.8;
  }
  else if ( displayed_balls_nb > 1 && displayed_balls_nb <= 6 ) k_total = av_width * av_height * 0.65;
  else if ( displayed_balls_nb > 6 && displayed_balls_nb <= 20 ) k_total = av_width * av_height * 0.75;
  else if ( displayed_balls_nb > 20 && displayed_balls_nb <= 50 ) k_total = av_width * av_height * 0.80;
  else if ( displayed_balls_nb > 50 && displayed_balls_nb <= 200 ) k_total = av_width * av_height * 0.86;
  else if ( displayed_balls_nb > 200 ) k_total = av_width * av_height * 0.92;

}


void keyPressed() {


    if(keyCode<256) keyboard.press(keyCode);

    if (key == 'r' || key == 'R') { // activando resortes
      if ( resorte_activado == true ) resorte_activado = false;
      else if ( resorte_activado == false ) resorte_activado = true;
    }
    if (key == 'i' || key == 'I') { // mostrar info en burbujas
      if ( show_info == true ) show_info = false;
      else if ( show_info == false ) show_info = true;
    }
    if (key == 'l' || key == 'L') { // mostrar burbujas opacas
      if ( llenar_burbujas == true ) llenar_burbujas = false;
      else if ( llenar_burbujas == false ) llenar_burbujas = true;
    }
    if (key == 'f' || key == 'F') { // cambiar modo de layout
      if ( layout_actual == "standard" ) layout_actual = "reduced";
      else if ( layout_actual == "reduced" ) layout_actual = "standard";
    }
    if ( keyboard.pressed(UP) || keyboard.pressed(DOWN) || keyboard.pressed(LEFT) || keyboard.pressed(RIGHT) ) { // aplicar gravedad
      hay_gravedad = true;
    } else hay_gravedad = false;
    if (key == 's') { // shaking
      for ( int i=0; i<balls.length; i++ ) {
        balls[i].x += random(-10,10);
        balls[i].y += random(-10,10);
      }
    }
    if (key == 'd' || key == 'D') { // redistribuyendo
      for ( int i=0; i<balls.length; i++ ) {
        balls[i].x = random(balls[i].r+space_left, width-space_right-balls[i].r);
        balls[i].y = random(balls[i].r+space_top, height-space_bottom-balls[i].r);
      }
    }

}

void keyReleased() {

  if(keyCode<256) keyboard.release(keyCode);

}

void mouseReleased() {
  if (stopped && selected != -1) {
    onPollChoiceSelect(selected)
  }
  selected = -1;
}



class Ball {

  float r;
  float m;

  float x;
  float y;

  float vx;
  float vy;

  float ka;

  int id;
  String nombre;
  int weight;

  // Spring
  float mass;                                       // Masa
  float kspring;                                    // Constante de resorte
  float damp;                                       // Damping
  float rest_posx = ( ( width-space_right ) / 2 ) + space_left / 2;
  float rest_posy = ( ( height-space_bottom ) / 2 ) + space_right / 2;
  float accel = 0;                                  // Aceleracion
  float force = 0;                                  // Fuerza

  boolean estamos_encima;

  Ball( int ID, float KA, String NOMBRE, int OCURR ) {

    ka = KA;
    r = sqrt( ka / PI );
    m = r;
    x = random(r+space_left,width-space_right-r);
    y = random(r+space_top,height-space_bottom-r);
    vx = random(-3,3);
    vy = random(-3,3);
    id = ID;
    nombre = NOMBRE;
    weight = OCURR;
    estamos_encima = false;

    mass = sqrt( ( ( (PI*pow((height-space_bottom-space_top)/2,2)*0.8) / 2000 ) / PI ) );
    damp = 0.85;
    kspring = 0.01;
  }

  void fall() {

    if ( keyboard.pressed(UP) ) vy -= grav;
    if ( keyboard.pressed(DOWN) ) vy += grav;
    if ( keyboard.pressed(LEFT) ) vx -= grav;
    if ( keyboard.pressed(RIGHT) ) vx += grav;
  }

  void spring() {

    rest_posx = ( ( width-space_right ) / 2 ) + space_left / 2;
    rest_posy = ( ( height-space_bottom ) / 2 ) + space_right / 2;

    if ( balls.length > 0 && ( balls[0].weight - balls[displayed_balls_nb-1].weight ) > 0 ) {
      float A = balls[0].weight;                        // maximo original
      float C = weight;                                 // valor original
      float B = balls[displayed_balls_nb-1].weight;    // minimo original
      float D = 5;                                           // nuevo maximo
      float E;                                               // nuevo minimo
      if ( displayed_balls_nb > 20 ) E = -1;
      else E = 0;
      kspring = -1 * ( ( ( A - C ) / ( A - B ) ) * ( D - E ) - D );
    }
    if ( displayed_balls_nb == 1 ) kspring = 4;

    //mass = r;

    force = -kspring * (y - rest_posy);    // f=-ky
    accel = force / mass;                  // Asignar aceleracion
    vy = damp * (vy + accel);              // Definir velocidad
    //y += vy;

    force = -kspring * (x - rest_posx);    // f=-ky
    accel = force / mass;                  // Asignar aceleracion
    vx = damp * (vx + accel);              // Definir velocidad
    //x += vx;
  }

  void bounce() {

    if ( y + vy + r > height-space_bottom ) {

      y = height-space_bottom - r;
      vx *= f;
      vy *= -b;
    }
    if ( y + vy - r < space_top ) {

      y = r+space_top;
      vx *= f;
      vy *= -b;
    }
    if ( x + vx + r > width-space_right ) {

      x = width-space_right - r;
      vx *= -b;
      vy *= f;
    }
    if ( x + vx - r < space_left ) {

      x = r+space_left;
      vx *= -b;
      vy *= f;
    }
  }

  void collide() {

    for ( int i=max_displayed_balls; i>=0; i-- ) {

      if ( i < balls.length ) {

        float X = balls[i].x;
        float Y = balls[i].y;
        float R = balls[i].r;
        float M = balls[i].m;

        float deltax = X-x;
        float deltay = Y-y;
        float d = sqrt(pow(deltax,2)+pow(deltay,2));

        if ( d < r + R && d > 0 ) {

          float dD = r + R - d;
          float theta = atan2(deltay,deltax);

          vx += -dD*cos(theta)*M/(m+M);
          vy += -dD*sin(theta)*M/(m+M);

          vx *= b;
          vy *= b;

        }
      }
    }
  }

  void move() {

    if ( estamos_encima && mousePressed && ( selected == -1 || selected == id ) ) {
      x = mouseX;
      y = mouseY;
      vx = 0;
      vy = 0;
      selected = id;
    } else {
      x += vx;
      y += vy;
    }


  }

  void encima() {

    if ( dist(x, y, mouseX, mouseY) < r ) estamos_encima = true;
    else estamos_encima = false;

  }

  void display() {

    float A = balls[0].weight;                        // maximo original
    float C = weight;                                 // valor original
    float B = balls[displayed_balls_nb-1].weight;    // minimo original
    float D;                                               // nuevo maximo
    float E;                                               // nuevo minimo
    //nuevo_valor = -1 * ( ( ( A - C ) / ( A - B ) ) * ( D - E ) - D );

    if ( visual_mode == "lineal" ) {

      if ( llenar_burbujas ) fill(255,255,255);
      else noFill();
      if ( estamos_encima ) fill(0,0,0,15);
      strokeWeight(r/10);
      //stroke(ColorLineasGrales);
      float lc = -1 * ( ( ( A - C ) / ( A - B ) ) * ( 60 - 200 ) - 60 );
      float lcalpha = -1 * ( ( ( A - C ) / ( A - B ) ) * ( 255 - 90 ) - 255 );
      if ( A == B ) { lcalpha = 128 ; lc = 0; }
      color local = color( lc );
      stroke( local );
      //noFill();
      ellipse(x,y,2*r-r/10,2*r-r/10);

      float tamanio = (2*r*1.2) / nombre.length();
      textFont(font, tamanio);
      textAlign(CENTER);
      fill(0, 102, 153, lcalpha);
      //fill(0, 102, 153);
      //if ( show_info || estamos_encima ) text(nombre, x, y+tamanio/5);
      if ( show_info ) text(nombre, x, y+tamanio/5);
      else text(nombre, x, y+tamanio/3);

      //if ( show_info || estamos_encima ) {
      if ( show_info ) {
        float tamanio1 = r*0.3;
        textFont(font, tamanio1);
        fill(0, 102, 153, lcalpha);
        text(str(weight-1), x, y+tamanio/3+tamanio1);
      }

    }

  }
}




//
// Funcion para dibujar barra de avance
// 23/07/05 :: P&A
//

void barraAvance( int x1, int y1,
                  int x2, int y2,
                  float ValParcial, float ValTotal,
                  color ColorLinea, color ColorRelleno ) {

  float AnchoReal = ( ( ( ValParcial * 100 ) / ValTotal ) * ( x2 - x1 )  ) / 100;

  strokeWeight(1);
  stroke(ColorLinea);
  noFill();
  rectMode(CORNERS);
  rect(x1, y1, x2, y2);

  noStroke();
  fill(ColorRelleno);
  rect(x1, y1, x1+AnchoReal+1, y2+1);

}



Keys keyboard = new Keys();

class Keys {

  boolean[] k;

  Keys() {
    k=new boolean[255];
    for(int i=0;i<k.length;i++) k[i]=false;
  }

  void press(int x) {
    k[x]=true;
  }

  void release(int x) {
    k[x]=false;
  }

  boolean pressed(int x) {
    return k[x];
  }

  void releaseAll() {
    for(int i=0;i<k.length;i++) k[i]=false;
  }

  boolean anyPressed() {
    for(int i=0;i<k.length;i++) if(k[i]==true) return true;
    return false;
  }
}
