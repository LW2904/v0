#include <math.h>

#define PI 3.14159265

// Most recent warning reported by any function.
extern char *last_error;

// Current X and Y coordinates of the cursor.
extern int cur_x;
extern int cur_y;

// Coordinate buffers written to by save and restore pos.
extern int buf_x;
extern int buf_y;

// Previous coordinates, for convenient cursor position restoring.
extern int last_x;
extern int last_y;

// Most recent error or warning reported by any function.
extern char *last_error;

/* Moves the cursor to the specified coordinates or 0/0 if they were invalid. In
 * that case, last_error will contain a warning message.
 * Saves the most recent cursor position (before the change).
 */
void cursor_move(int x, int y);

/* Moves the cursor by delta_x and delta_y relative to the current cursor
 * position.
 */
void cursor_move_by(int delta_x, int delta_y);

/* Reverts the last cursor movement. Note that the last movement may have not
 * been through a direct call to cursor_move.
 */
void cursor_move_back(void);

/* Saves the current position to the position buffer.
 */
void cursor_pos_save(void);

/* Moves the cursor to the position stored in the position buffer and resets it.
 */
void cursor_pos_restore(void);

/* Draws a horizontal line from X/Y of a given length (inclusive).
 */
void draw_line_horizontal(int x, int y, int length);

/* See draw_line_horizontal.
 */
void draw_line_vertical(int x, int y, int length);

/* Draws a square where X/Y is the top left corner with a given width
 * (inclusive).
 */
void draw_square(int x, int y, int width);

/* Moves the terminal down by it's height, effectively clearing it.
 */
void screen_clear();

/* Draws the status bar which contains current X and Y coordinates of the
 * cursor and the most recent warning/error reported by any function.
 */
void status_draw();

/*
 * Erase the line at the given index (starts at zero, inclusive) or zero if it
 * was invalid in which case last_error will contain a warning.
 */
void line_erase(int line);

/* Returns `orig` or `min` if `orig` is not in the range of [min, +inf[.
 */
static inline int constrain_above(int orig, int min);

/* Return `orig` or `min` if it is not in the range of [min, Infinity[.
 */
static inline int constrain_above(int orig, int min)
{
	return orig < min ? min : orig;
}

/* Returns a point on a cirle's circumference given an angle in degrees and a
 * radius.
 */
static inline void get_circle_point(int radius, int angle, int *x, int *y)
{
	float radians = angle * (PI / 180);

	*x = radius * cos(radians);
	*y = radius * sin(radians);
}