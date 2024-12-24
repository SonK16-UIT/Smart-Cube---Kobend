#!/usr/bin/env python

from OpenGL.GL import *
from OpenGL.GLU import *
import pygame
from pygame.locals import *
import serial
from datetime import datetime

# Configure your serial port for the MPU9250 data
ser = serial.Serial('COM7', 115200, timeout=1)

# Initialize variables for pitch, roll, yaw data
pitch = roll = yaw = 0.0
yaw_mode = False
recording = False
recorded_data = []
log_data = []
initial_message_display = True  # Flag to control displaying initial messages
initial_messages = []           # Stores initial ESP messages

# Function to resize the window
def resize(width, height):
    if height == 0:
        height = 1
    glViewport(0, 0, width, height)
    glMatrixMode(GL_PROJECTION)
    glLoadIdentity()
    gluPerspective(45, 1.0 * width / height, 0.1, 100.0)
    glMatrixMode(GL_MODELVIEW)
    glLoadIdentity()

# Function to initialize OpenGL settings
def init():
    glShadeModel(GL_SMOOTH)
    glClearColor(0.0, 0.0, 0.0, 0.0)
    glClearDepth(1.0)
    glEnable(GL_DEPTH_TEST)
    glDepthFunc(GL_LEQUAL)
    glHint(GL_PERSPECTIVE_CORRECTION_HINT, GL_NICEST)

# Function to render text on the screen
def drawText(position, textString):     
    font = pygame.font.SysFont("Arial", 18, True)
    textSurface = font.render(textString, True, (255,255,255,255), (0,0,0,255))     
    textData = pygame.image.tostring(textSurface, "RGBA", True)     
    glRasterPos3d(*position)     
    glDrawPixels(textSurface.get_width(), textSurface.get_height(), GL_RGBA, GL_UNSIGNED_BYTE, textData)

# Function to get the current orientation based on pitch and roll
def get_current_side(pitch, roll):
    if -12 <= pitch <= 6 and -7 <= roll <= 11:
        return "Top"
    elif -2 <= pitch <= 17.55 and -180 <= roll <= 179:
        return "Bottom"
    elif -5 <= pitch <= 13 and 90 <= roll <= 98:
        return "Front"
    elif -7 <= pitch <= 14 and -104 <= roll <= -89:
        return "Back"
    elif 77 <= pitch <= 88 and -179 <= roll <= 179:
        return "Right"
    elif -89 <= pitch <= -78 and -176 <= roll <= 178:
        return "Left"
    else:
        return "Unknown"

# Function to draw the 3D cube and overlay text
def draw():
    global pitch, roll, yaw, yaw_mode, initial_message_display
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
    
    glLoadIdentity()
    glTranslatef(0, 0.0, -7.0)

    # Display pitch, roll, yaw values and orientation
    osd_text = f"pitch: {pitch:.2f}, roll: {roll:.2f}"
    current_side = get_current_side(pitch, roll)
    if yaw_mode:
        osd_text += f", yaw: {yaw:.2f}, side: {current_side}"
    drawText((-2, -2, 2), osd_text)

    # Display initial ESP messages if still in message display mode
    if initial_message_display:
        for i, message in enumerate(initial_messages[-5:]):  # Show the last 5 messages
            drawText((2.5, 2 - i * 0.3, 0), message)

    # Display recording status
    if recording:
        drawText((2.5, 2.5, 0), "Recording... Press 'R' to stop")

    # Apply initial rotation to start viewing from the top
    glRotatef(90, 1.0, 0.0, 0.0)

    # Apply additional rotation based on pitch, roll, and yaw
    if yaw_mode:
        glRotatef(-yaw, 0.0, 1.0, 0.0)  # Invert yaw to match real-life rightward rotation
    glRotatef(pitch, 1.0, 0.0, 0.0)     # Pitch, rotate around x-axis
    glRotatef(-roll, 0.0, 0.0, 1.0)     # Roll, rotate around z-axis

    # Draw a simple 3D object (cube)
    glBegin(GL_QUADS)
    glColor3f(0.0, 1.0, 0.0)   # Green side
    glVertex3f(1.0, 0.2, -1.0)
    glVertex3f(-1.0, 0.2, -1.0)
    glVertex3f(-1.0, 0.2, 1.0)
    glVertex3f(1.0, 0.2, 1.0)

    glColor3f(1.0, 0.5, 0.0)   # Orange side
    glVertex3f(1.0, -0.2, 1.0)
    glVertex3f(-1.0, -0.2, 1.0)
    glVertex3f(-1.0, -0.2, -1.0)
    glVertex3f(1.0, -0.2, -1.0)

    glColor3f(1.0, 0.0, 0.0)   # Red side
    glVertex3f(1.0, 0.2, 1.0)
    glVertex3f(-1.0, 0.2, 1.0)
    glVertex3f(-1.0, -0.2, 1.0)
    glVertex3f(1.0, -0.2, 1.0)

    glColor3f(1.0, 1.0, 0.0)   # Yellow side
    glVertex3f(1.0, -0.2, -1.0)
    glVertex3f(-1.0, -0.2, -1.0)
    glVertex3f(-1.0, 0.2, -1.0)
    glVertex3f(1.0, 0.2, -1.0)

    glColor3f(0.0, 0.0, 1.0)   # Blue side
    glVertex3f(-1.0, 0.2, 1.0)
    glVertex3f(-1.0, 0.2, -1.0)
    glVertex3f(-1.0, -0.2, -1.0)
    glVertex3f(-1.0, -0.2, 1.0)

    glColor3f(1.0, 0.0, 1.0)   # Magenta side
    glVertex3f(1.0, 0.2, -1.0)
    glVertex3f(1.0, 0.2, 1.0)
    glVertex3f(1.0, -0.2, 1.0)
    glVertex3f(1.0, -0.2, -1.0)
    glEnd()

# Function to read data from serial port
def read_data():
    global pitch, roll, yaw, initial_message_display, initial_messages, log_data, recording, recorded_data
    ser.write(b".")  # Request data
    line = ser.readline().decode().strip()

    # Check if line contains comma-separated numeric data (assumes pitch, roll, yaw)
    if len(line.split(", ")) == 3:
        try:
            # Parse pitch, roll, and yaw
            angles = line.split(", ")
            pitch = float(angles[0])
            roll = float(angles[1])
            yaw = float(angles[2])

            # Log entry for real-time display
            log_entry = f"Pitch: {pitch:.2f}, Roll: {roll:.2f}, Yaw: {yaw:.2f}"
            log_data.append(log_entry)
            if recording:
                recorded_data.append(log_entry)
            
            # Stop displaying initial messages once numeric data is received
            initial_message_display = False
        except ValueError:
            print("Invalid data received")
    else:
        # Add the message to initial_messages list if in message display mode
        if initial_message_display:
            initial_messages.append(line)
            if len(initial_messages) > 5:  # Limit the number of initial messages displayed
                initial_messages.pop(0)

# Main function to initialize the application and handle events
def main():
    global yaw_mode, recording, recorded_data

    pygame.init()
    screen = pygame.display.set_mode((640, 480), OPENGL | DOUBLEBUF)
    pygame.display.set_caption("Press Esc to quit, Z toggles yaw mode, R to record")
    resize(640, 480)
    init()

    frames = 0
    ticks = pygame.time.get_ticks()
    while True:
        for event in pygame.event.get():
            if event.type == QUIT or (event.type == KEYDOWN and event.key == K_ESCAPE):
                pygame.quit()
                ser.close()
                return
            elif event.type == KEYDOWN and event.key == K_z:
                yaw_mode = not yaw_mode
                ser.write(b"z")
            elif event.type == KEYDOWN and event.key == K_r:
                if recording:
                    # Stop recording and save data
                    recording = False
                    save_recorded_data()
                    recorded_data = []
                else:
                    # Start recording
                    recording = True
                    recorded_data = []
                    print("Recording started")

        read_data()
        draw()
        pygame.display.flip()
        frames += 1

    print("FPS:", (frames * 1000) / (pygame.time.get_ticks() - ticks))

# Function to save recorded data to file with timestamp
def save_recorded_data():
    if recorded_data:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"recorded_data_{timestamp}.txt"
        with open(filename, "w") as f:
            f.write("\n".join(recorded_data))
        print(f"Data saved to {filename}")

if __name__ == '__main__':
    main()
