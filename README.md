# bitwig-stage-control
Controller Scripts to manage Bitwig in a live performance environment using one large project.

## Goals

 * Immediately seek to and load a specific performance configuration without touching the computer
 * Keys and controls should always control the current performance configuration, with no possibility of accidentally changing that.
 * Send program change to VSTi plugins (VB3 = indispensible!)
 * Allow remote control using Program Change commands from MIDI IN
 * Stability and maintainability

## Strategy

This design attempts to solve the problem by loading all possible configurations into a single project. "Current program" is represented by an integer value stored in a User Control. Each program maps to a dedicated group of 5 scenes.

Benefits:
 * Zero load time when switching patches
 * It's the Bitwig Way, simple to code

Drawbacks:
 * Plugin parameters are not reset to the saved values when you select a program
 * Difficult to do creative routing 
 * Requires much RAM and slightly more CPU
 * Limited number of clips per patch, routing, etc, to reduce the ram/cpu limitations
 * At 5 patches per scene, you could have as many as 320 scenes to manage. Ew.

### Alternate approaches

The "open tab" approach would require the controller script to locate scenes by navigating the list of open tabs. This requires opening every possible patch in a tab before starting. Bitwig can handle this, but can you?

The controller script could  load presets into devices in the current open project by a) navigating the project structure to locate devices, and then b) opening the preset navigator and reading the names of all the presets. This would probably work but look funny, and seems prone to error. As we don't really want errors on stage, I have vetoed this approach for now.

## What it does and how to use it

When InControl is turned off, Launchkey acts like a normal dumb MIDI controller. When it is turned on, the controller is hard wired to a performance configuration.

You will need a project with 4 tracks, where every 5 scenes is reserved for a program. So, program 2 is scene 5, program 3 is scene 10. Anything you want to control with the keyboard must be in track 1.

 * Keyboard always goes to track 1
 * Pads control only the clips in the scenes for the current patch's bank of tracks
 * Sliders are macros 1-8. Map your macros to control whatever.
 * knobs are volume for track 1-4
 * Transport controls work as normal 
 * Track Next/Prev buttons go to next/previous program

Exceptions: these controls work whether InControl is mapped or not:

 * Master slider always controls mater volume

### Loading Patches

The top right circle pad (red!) is a patch bank toggle button. When you hit it, the pads will display the current patch number as a bank/patch combination. Yes, this limits you to 64 patches. Yes this means you need to learn to think in base 8. :) 

When you hit the lower row (patch), the patch loads, the transport is stopped, and the keyboard exits patch bank mode. 

## Requirements

Currently supports Novation Launchkey. Will autodetect Launchkey 61, but should work without 
changes on any Launchkey v1 keyboard (grey/orange).

Oh, and you need Bitwig. And a computer.
