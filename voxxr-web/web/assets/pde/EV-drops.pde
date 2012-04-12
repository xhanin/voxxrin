
ArrayList evenires = new ArrayList();
ArrayList slots  = new ArrayList();
PFont font = loadFont("Verdana");
int box_w       = 20,       box_h     = 10,
    col_gap     = 1,        slot_gap  = 3,         legend_gap = 4,
    brick_start = 20,       brick_end = 150,
    slides      = 1,
    canvas_x    = 480,      canvas_y  = 180,
    font_size   = 12,
    ev_per_col  = floor((brick_end - brick_start) / box_h) - 1;
float gravita = 0.03;
HashMap palette = new HashMap();

void setPalette(HashMap p){
    palette = p;
}

class Slot {
  color bcolor;
  String kind;
  int index, desired_index;
  int pos_x, last_col;
  ArrayList ev;

  Slot(idx, k){
    last_col = 0;
    ev = new ArrayList();
    desired_index = idx;
    kind = k;

    index = findSlotPosition(this);
    prev_slot = index == 0 ? null : slots.get(index-1);
    pos_x    = ( prev_slot == null ? slot_gap :
                 (prev_slot.get_pos_x(prev_slot.last_col)  + box_w + slot_gap)
               );

    slots.add(index, this);
    for(int k=index+1; k< slots.size(); k++ ) {
        slots.get(k).pos_x =
            slots.get(k-1).get_pos_x(slots.get(k-1).last_col)
            + box_w + slot_gap;
    }
  }

  int inc(evenire){
    if(floor(ev.size() / ev_per_col) > last_col){
      for(int k=index+1; k< slots.size(); k++ )
        slots.get(k).pos_x += (box_w + col_gap);
      last_col ++;
    }
    ev.add(evenire);
    return last_col;
  }

  color get_color(){
    return palette[desired_index];
  }

  int get_pos_x(col){
    return pos_x + (box_w + col_gap) * col;
  }

  void draw(){
    fill(get_color());
    textFont(font, font_size);
    textAlign(CENTER);
    text(kind, pos_x, brick_end + legend_gap + font_size,  get_pos_x(last_col+1) - pos_x, font_size + 1);
  }
}

Slot getSlot(k){
  for(int i=0; i< slots.size(); i++)
    if(((Slot) slots.get(i)).kind == k)
      return ((Slot) slots.get(i));
  return null;
}

int findSlotPosition(slot) {
    for(int i=0; i< slots.size(); i++ ) {
        if (slots.get(i).desired_index > slot.desired_index) {
            return i;
        }
    }
    return slots.size();
}

class Evenire {
  HashMap evenire;
  int index;
  Slot slot;
  float pos_y, vel_y;
  int slot_index;
  int col_x, frames;

  Evenire(HashMap data, i){
    evenire = data; frames = 0;
    pos_y = brick_start; vel_y = 0;
    slot = getSlot(data.value) ||
           new Slot(data.index, data.value);
    index = i;
    col_x = slot.inc(this);
    slot_index = slot.ev.size() -1;
  }

  void draw(){
    int diff_x = mouseX - slot.get_pos_x(col_x);
    int diff_y = mouseY - pos_y;
    if(mouse_down && 0 < diff_x && diff_x < box_w && 0 < diff_y && diff_y < box_h){
      active_evenire = this;
      onEVSelected(evenire);
      mouse_down = false;
    }
    fill(slot.get_color());
    frames = (frames <= 500 && pos_y > brick_start + 30) ? frames + 1 : frames;
    boolean update = (frames < 500);
    if(update){
      for(int k=0; k < slot_index; k++){
        Evenire ev = (Evenire) slot.ev.get(k);
        if(col_x == ev.col_x &&  abs( pos_y - ev.pos_y) < (box_h+2)){
          pos_y  = ev.pos_y - (box_h+1);
          update = false;
          break;
        }
      }
    }
    rect(slot.get_pos_x(col_x), pos_y, box_w, box_h);
    if(update && pos_y < brick_end){
      vel_y  += gravita;
      pos_y  += vel_y;
    }
  }
}

void addEvenire(HashMap evenire){
  // expected properties
  //    - index: the rate value as a number [1-5], telling where the EV wants to be
  //    - value: what is displayed to the user for this rate (usually Rx, eg R1, R2, ...)
  //    - user: name of the user who sent the EV
  evenires.add(new Evenire(evenire,evenires.size()));
}

void setup(){
  background(0);
  noStroke();
  colorMode(HSB, 255);
}

void draw(){
  size(canvas_x, canvas_y);
  textFont(font, 18);
  textAlign(LEFT);
  fill(255);
  textFont(font, font_size);
  if(active_evenire){
    fill(active_evenire.slot.get_color());
    text(active_evenire.evenire.user + ": " + active_evenire.evenire.value,10, 10, 200, 30);
  }

  for(int i=0; i<evenires.size(); i++){
    ((Evenire) evenires.get(i)).draw();
  }
  for(int i=0; i<slots.size(); i++){
    ((Slot) slots.get(i)).draw();
  }

  if(slots.size() > 0){
    Slot last_slot = ((Slot) slots.get(slots.size()-1));
    if(last_slot.get_pos_x(last_slot.last_col) > (canvas_x * slides) - 10){
      evenires = new ArrayList();
      slots  = new ArrayList();
    }
  }
}

boolean mouse_down = false;
Evenire active_evenire = null;

void mousePressed(){
  mouse_down = true;
}