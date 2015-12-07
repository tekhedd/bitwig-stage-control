# bitwig-stage-control
Controller Scripts to manage Bitwig in a live performance environment using one large project.

## Goals

 * Immediately seek to and load a specific performance configuration without touching the computer
 * Keys and controls should always control the current performance configuration, with no possibility of accidentally changing that.
 * Load Bitwig presets containing native and/or VST plugins
 * Send program change to VSTi plugins
 * Allow remote control using Program Change commands from MIDI IN
 * Stability and maintainability
 * Map controls to currently loaded macros as completely as possible
 * Always-on access to master volume.
 * Intelligent mapping of remaining controls to channel volumes?

Dreams:

 * Find and load preset by name (via MIDI SYSEX messages?)
 * Map songs to patches or sequence-of-patches

## Strategy

This design attempts to solve the problem by loading all possible configurations into a single project. Presets are loaded into the first device in Track 1 by searching for specially-named presets. "Current program" is represented by an integer value stored in a User Control. Each program maps to a dedicated group of 5 scenes for clip launching (configurable).

Benefits:
 * Fast load time when switching patches
 * It's the Bitwig Way, simple to code
 * By using Instrument Layers for the default device, any combination of instruments can be loaded with a patch
 * Keyboard always sends to Track 1, no danger of accidentally disabling input, no need to enable

Drawbacks:
 * Limited number of clips per patch
 * At 5 Scenes per patch, there could be a lot of scenes
 * No way to pass raw MIDI CC data to Track 1
 * Controls are limited to 8 Macros, because loaded presets do not contain mappings

### Alternate approaches

The "open tab" approach would require the controller script to locate scenes by navigating the list of open tabs. This requires opening every possible patch in a tab before starting. Bitwig can handle this, but can you?

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
