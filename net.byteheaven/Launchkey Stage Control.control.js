// tekHedd's Single-project patch navigator for launchkey
// 

loadAPI(1);

host.defineController("BYTE HEAVEN", "Launchkey Stage Control", "1.0.0.0", "88182079-f4b0-452c-a598-82850009d615");

host.defineMidiPorts(2, 2);
host.addDeviceNameBasedDiscoveryPair(["Launchkey 61", "MIDIIN2 (Launchkey 61)"], ["Launchkey 61", "MIDIOUT2 (Launchkey 61)"]);
host.addDeviceNameBasedDiscoveryPair(["Launchkey 61 MIDI 1", "Launchkey 61 MIDI 2"], ["Launchkey 61 MIDI 1", "Launchkey 61 MIDI 2"]); 

load("net.byteheaven.LaunchkeyBlinkeys.js");
load("net.byteheaven.LaunchkeyPatchSelectButton.js");
load("net.byteheaven.LaunchkeyCurrentPatchDisplay.js");
load("net.byteheaven.LaunchkeyClipsDisplay.js");
load("net.byteheaven.PresetLoader.js");

/**
 * @const
 * Number of scenes in each program.
 */ 
var PROGRAM_WIDTH = 5;

/**
 * We're only managing 4 rows, hard coded for the most part
 */
var BANK_HEIGHT = 4;

// NoteInput for non-InControl messages.
var keyboardNoteInput;

// Transport controls
var transport;

var sceneBank;

// primary device that we are controlling
var primaryDevice;

// For master volume ctrl etc
var masterTrack;

// Main track bank: just the tracks, not the master or effects
var trackBank;

var blinkeys;
var currentPatchDisplay;
var clipsDisplay;

var patchSelector;

var patchSelectButton;

var pitchUserControl;

function instrumentRackTrack()
{
   return trackBank.getTrack( 0 ); 
};

function clipsTrack3()
{
   return trackBank.getChannel( 1 ); 
}
function clipsTrack2()
{
   return trackBank.getChannel( 2 );
}

function clipsTrack1()
{
   return trackBank.getChannel( 3 ); 
}

var subDevice1;
var subDevice2;

// Setting the value of the incontrol light also sets the value
// of incontrol for that button
function Incontrol( ctrlId )
{
   this.ctrlId = ctrlId;
}

Incontrol.prototype.send = function( isLit )
{
   var value = isLit ? 0x7f : 0x00;
   host.getMidiOutPort(1).sendMidi( 0x90, this.ctrlId, value ); // top InControl btn
};

// Toggling an InControl light also changes the incontrol state of the
// Launchkey surface, and triggers an InControl message on the input.
var incontrol_knobs = new Incontrol( 0x0d );
var incontrol_mix = new Incontrol( 0x0e );
var incontrol_pads = new Incontrol( 0x0f );

// If true, we are in inControl mode for pads (and keyboard)
var isIncontrolPads = true;

// 8 banks of 8 patches are mapped to the two rows of buttons,
// the top row is bank, the bottom row is patch.
// 
// Patch/bank selection is active when the InControl pads button is 
// active. 
function PatchSelector( currentPatchDisplay, patchUserControl, presetLoader )
{
   this._patchDisplay = currentPatchDisplay;
   
   // the patch number as a control
   this.patchUserControl = patchUserControl;
   
   /**
    * @type !PresetLoader
    */
   this._presetLoader = presetLoader;
};

PatchSelector.prototype.recalc = function()
{
   var program = this.getCurrentProgram();
   
   // TODO: use patch mapper instead of directly
   //       setting control value here.
   this.patchUserControl.set( program, 100.0 );

   // Make sure "indication" is set for the right block of things
   this._scrollToSceneInternal( program );

   // Launch the last scene in the bank
   trackBank.getClipLauncherScenes().launch( PROGRAM_WIDTH - 1 );
   
   // Enable monitoring for track 1. Yes dangerous. So be careful
   // what you hook up. We need input working.
   
   // var selector = instrumentRackTrack().getSourceSelector();
   // instrumentRackTrack().getMonitor().set( true ); // INSTANT CRASH
   
   // Send program change for plugins (only works if monitoring so never mind)
   // keyboardNoteInput.sendRawMidiEvent( 0xc0, program, 0 );
   
   var loadedName = this._presetLoader.loadPreset( program );
};

//
// Calculate the current patch from the bank and patch offsets.
// Zero-indexed.
//
PatchSelector.prototype.getCurrentProgram = function()
{
   var bank = this._patchDisplay.getBank();
   var patch = this._patchDisplay.getPatch();
   return (bank * 8) + patch;
};

//
// Ensure that the current program's scene is within the current "scrollTo" page
// so that button presses based on offset will work properly.
//
PatchSelector.prototype.scrollToCurrentProgram = function()
{
   this._scrollToSceneInternal( this.getCurrentProgram() );
};

//
// Moves the "indicated" track region to include this program. 
//
PatchSelector.prototype._scrollToSceneInternal = function( program )
{
   var rootScene = program * PROGRAM_WIDTH; // Each program is a grid if 8 scenes
   
   trackBank.scrollToChannel( 0 ); // keep the first bank of tracks selected
   
   // Why twice? In v1.3.5, if you only call it once, sometimes it actually
   // scrolls to the *next* bank of scenes. Calling it twice always works. :/
   trackBank.scrollToScene( rootScene );
   trackBank.scrollToScene( rootScene );
   
   sceneBank.scrollTo( rootScene );
   sceneBank.scrollTo( rootScene );
   
   // Make sure the first 8 tracks are marked as "we are messing with this"
   for (var i = 0; i < BANK_HEIGHT; i++)
   {
      var track = trackBank.getTrack( i );
      if (track) 
      {
         track.getClipLauncherSlots().setIndication( true );
      }
   }
   
   clipsTrack1().getClipLauncherSlots().select( rootScene );
};

PatchSelector.prototype.reset = function()
{
   this._patchDisplay.setBank( 0 );
   this._patchDisplay.setPatch( 0 );
   this.recalc();
};

PatchSelector.prototype.setBank = function( bank )
{
   this._patchDisplay.setBank( bank ); // does range checking
   this.recalc();
};

PatchSelector.prototype.scrollPositionChanged = function( pos )
{
   // Well, this is awkward. Do we force it back where we wanted
   // it, or what?
};

PatchSelector.prototype.setPatch = function( patch )
{
   this._patchDisplay.setPatch( patch ); // does range checking
   this.recalc();
};

PatchSelector.prototype.next = function( patch )
{
   var patch = this._patchDisplay.getPatch();

   ++ patch;
   if (patch >= 8) {
      patch = 0;
      
      var bank = this._patchDisplay.getBank();
      ++ bank;
      if (bank >= 8) {
         // End of patch banks. Don't wrap.
         return; // ** QUICK EXIT **
      }
      this.setBank( bank );
   }
   
   this.setPatch( patch );
};

PatchSelector.prototype.prev = function( patch )
{
   var patch = this._patchDisplay.getPatch();
   var bank = this._patchDisplay.getBank();

   -- patch;
   if (patch < 0) {
      patch = 7;
      
      -- bank;
      if (bank < 0) {
         // Don't wrap, or do you want to go to patch 64?
         return; // ** QUICK EXIT **
      }
      this.setBank( bank );
   }

   this.setPatch( patch );
};

function init()
{
   // Create an input that accepts nothing (actually FFFFFF is "reset" but whatever, 
   // if we don't provide a valid mask this either fails or creates a default input,
   // which is totally not what we want.)
   //
   // We will manually forward note events in the midi callback.
   //
   // I don't think this controller *does* channel pressure (Dxxxxx) 
   // pitch bend (e0????) is only 7 bit, which you'll already know if you've
   // ever used the pitch bend control on a Launchkey. :}
   
   keyboardNoteInput = host.getMidiInPort(0).createNoteInput( "Keyboard", "FFFFFF" );
   keyboardNoteInput.setShouldConsumeEvents( false );
   
   // Pads: note on/off on channel 10 when InControl is off.
   host.getMidiInPort(0).createNoteInput( "Pads", "89????", "99????" ) // "D?????", "E?????" );

   host.getMidiInPort(0).setMidiCallback( onMidi0 );
   host.getMidiInPort(1).setMidiCallback( onMidi1 );
   
	transport = host.createTransport();
   sceneBank = host.createSceneBank( PROGRAM_WIDTH );
   masterTrack = host.createMasterTrack( PROGRAM_WIDTH * 64 ); 
   
   // TODO: Can't figure how to scroll the display here
   
   trackBank = host.createMainTrackBank( BANK_HEIGHT, 0, PROGRAM_WIDTH );
   
   blinkeys = new LaunchkeyBlinkeys( host.getMidiOutPort(1) );
   currentPatchDisplay = new LaunchkeyCurrentPatchDisplay( blinkeys );
   clipsDisplay = new LaunchkeyClipsDisplay( blinkeys );
   patchSelectButton = new LaunchkeyPatchSelectButton( blinkeys );
   
   var controlBank = host.createUserControls( 2 );
   
   var patchUserControl = controlBank.getControl( 0 ); // current patch 0.00 - 0.63
   pitchUserControl = controlBank.getControl( 1 );
   
   patchUserControl.setIndication( true ); // it's mapped
   patchUserControl.setLabel( "Patch Number" );
   
   pitchUserControl.setIndication( true );
   pitchUserControl.setLabel( "Pitch Bend" );
   
   // * Create a device that will always point to the first device of the first 
   // track, and then get that device as the primaryDevice.

   // This moves with the cursor. NO.
   // var cursorTrack = host.createArrangerCursorTrack( 0, 1 );
   // primaryDevice = cursorTrack.getPrimaryDevice();
   
   // Cursor is a device and also a cursor I think.
   var bank = instrumentRackTrack().createDeviceBank( 1 );
   bank.scrollTo( 0 ); // go first in chain
   primaryDevice = bank.getDevice( 0 ); // get first(only) device in bank
   
   // We will load presets into the primary device
   var presetLoader = new PresetLoader( primaryDevice );
   presetLoader.setPatchLoadedObserver( function(number, name){
      if (name)
      {
         host.showPopupNotification( "" + name + ' (' + (number + 1) + ')' );
      }
      else
      {
         host.showPopupNotification( 'NO PRESET FOUND (' + (number + 1) + ')' );
      }
   });
   

   patchSelector = new PatchSelector( currentPatchDisplay, patchUserControl, presetLoader );
   
   // * Create a device that will point to:
   //   primaryDevice -> layer(0) -> Primary Device
   //   So we can manipulate its macros.
   primaryDevice.hasLayers().addValueObserver(function(hasLayers){
      println( "Primary device has layers: " + hasLayers );
      if (hasLayers)
      {
         // LayerBank CAUSES CRASH
         // var layerBank = primaryDevice.createLayerBank( 1 );
         // layerBank.scrollToChannel( 0 );
         // var subDeviceBank0 = layerBank.getChannel(0).createDeviceBank( 1 );
         // subDeviceBank0.scrollTo( 0 );
         // subDevice1 = subDeviceBank0.getDevice( 0 );
      }
   });
   

   // ** Set initial state **
   
   // What shall that extra round button do?
   blinkeys.getBottomCircleLed().setColor( [0, 0] );
   
   // If the bank changes we need to update our current patch? Maybe?
   sceneBank.addScrollPositionObserver( function(pos) {
      patchSelector.scrollPositionChanged( pos );
   },
   0 );
   
   // Track the current state of the selected clips

   clipsTrack1().getClipLauncherSlots().addHasContentObserver(function(slotIx, hasClip) {
      clipsDisplay.updateHasClip( 0, slotIx, hasClip );
   });

   clipsTrack2().getClipLauncherSlots().addHasContentObserver(function(slotIx, hasClip) {
      clipsDisplay.updateHasClip( 1, slotIx, hasClip );
   });

   clipsTrack3().getClipLauncherSlots().addHasContentObserver(function(slotIx, hasClip) {
      clipsDisplay.updateHasClip( 2, slotIx, hasClip );
   });
   
   clipsTrack1().getClipLauncherSlots().addPlaybackStateObserver(function(slotIx, state, isQueued) {
      clipsDisplay.updatePlaybackState( 0, slotIx, state, isQueued );
   });

   clipsTrack2().getClipLauncherSlots().addPlaybackStateObserver(function(slotIx, state, isQueued) {
      clipsDisplay.updatePlaybackState( 1, slotIx, state, isQueued );
   });

   clipsTrack3().getClipLauncherSlots().addPlaybackStateObserver(function(slotIx, state, isQueued) {
      clipsDisplay.updatePlaybackState( 2, slotIx, state, isQueued );
   });

   // Enable InControl mode: C1, velocity 127
   host.getMidiOutPort(1).sendMidi( 0x90, 0x0C, 0x7F );

   incontrol_knobs.send(true); // default to InControl Stage Mode or whatever
   incontrol_mix.send(true);
   incontrol_pads.send(true);

   updateIndications();

   patchSelector.reset();
}

function updateIndications()
{
   // There are 8 macros. And that is that.
   // 1 - pitch
   // 2 - mod wheel
   // 3 - sustain
   // 4 - MASTER toggle for what it's worth.
   // 5-8 - sliders 1-4
   
   for (var i = 0; i < 8; i++)
   {
      primaryDevice.getMacro(i).getAmount().setIndication(true);
   }

   // Map sliders 5-8 directly to the first layer's device macros 1-4
   // Map knobs 1-4 to the second and third layer's macros 1-4
   // for (var i = 0; i < 4; i++)
   // {
      // subDevice1.getMacro(i).getAmount().setIndication(true);
   // }
}

function exit()
{
   // Turn off lights
   // TODO
   
   // Disable InControl mode
   host.getMidiOutPort(1).sendMidi( 0x90, 0x0C, 0x00 );
}

function flush()
{
   // Are we in current patch mode? 
   if (patchSelectButton.getIsActive())
   {
      currentPatchDisplay.flush();
   }
   else
   {
      clipsDisplay.flush();
   }
}

function toggleMasterButton()
{
   var newval = ! blinkeys.masterButtonLed.isOn();
   blinkeys.masterButtonLed.setIsOn( newval );

   primaryDevice.getMacro(3).getAmount().set( newval ? 1 : 0, 2 ); // macro 3
}

function onMidi0(status, data1, data2)
{
   /*
      println( "MIDI0" );
      printMidi(status, data1, data2);
   */

   if (MIDIChannel(status) == 0) // channel 1
   {
      if (isChannelController(status) && data1 == 0x3b) // master button - always mapped. I mean, it's the MASTER right?
      {
         // This button is so cool that it gets special treatment.
         if (data2 == 127) {
            toggleMasterButton();
         }
      }
      else if (isIncontrolPads)
      {
         // in InControl pads mode, force keyboard notes to track 1
         if (isNoteOn(status))
         {
            instrumentRackTrack().startNote( data1, data2 );
         }
         else if (isNoteOff(status))
         {
            instrumentRackTrack().stopNote( data1, data2 );
         }
         else if (status == 0xe0) // is pitch bend, channel 1
         {
            // Pitch bend: macro 1 (sorry no per-note pitch today)
            // (Pitch is 7 bit on the Launchkey D: lsb bits are always 0.)
            // As we know, it's 14 bits, with the middle at 0x2000;
            var bendPos = ((data2 << 7) + data1); 
            primaryDevice.getMacro(0).getAmount().set( bendPos, 0x4000 );
         }
         else if (isChannelController(status))
         {
            if (data1 == 0x01) // mod wheel
            {
               primaryDevice.getMacro(1).getAmount().set( data2, 128 ); // macro 2
            }
            else if (data1 == 0x40) // sustain
            {
               primaryDevice.getMacro(2).getAmount().set( data2, 128 ); // macro 3
            }
         }
         
         // No default event passthrough. The mapper can map to raw 
         // MIDI and in performance mode we don't want anything
         // happening that's not automated. If you must have CC, you need
         // to write a VST that can generate it because damned if I can
         // find one.
      } 
      else 
      {
         // event passthrough to the input
         keyboardNoteInput.sendRawMidiEvent( status, data1, data2 );
      }
   }
   else if (MIDIChannel(status) == 9)
   {
      // Drum pads. Retained here, well, just in case I guess.
      // if (isNoteOn(status))
      // {
         // // bottom row = 36-39, 45-47
         // // top row = 40-43, 48-51
         // if (data1 >= 36 && data1 <= 39)
         // {
            // var i = data1 - 36;
         // }
         // else if (data1 >= 44 && data1 <= 47)
         // {
            // var i = data1 - 44 + 4; 
         // }
         // else if (data1 >= 40 && data1 <= 43) // Top row left 4
         // {
            // var i = data1 - 40;
         // }
         // else if (data1 >= 48 && data1 <= 51) // Top row right 4
         // {
            // var i = data1 - 48 + 4;
         // }
      // }
   }
}

function onMidi1(status, data1, data2)
{
   /*
      printMidi(status, data1, data2);
   */

   if (isChannelController(status))
   {
      if (data1 >= 21 && data1 <= 28) // knob
      {
         var knobIndex = data1 - 21;
         if (knobIndex < BANK_HEIGHT)
         {
            trackBank.getTrack(knobIndex).getVolume().set(data2, 128);
         }
      }
      else if (data1 >= 41 && data1 <= 48) // slider
      {
         var sliderIndex = data1 - 41;
         
         // Slider 1-4 = macro 5-8
         // Slider 5-8 = sub-instrument 1 macros 1-4
         
         if (sliderIndex < 4)
         {
            primaryDevice.getMacro(sliderIndex + 4).getAmount().set(data2, 128);
         }
         else
         {
            // TODO uncomment when layerBank no longer causes crash
            // subDevice1.getMacro(sliderIndex - 4).getAmount().set(data2, 128);
         }
      }
      else if (data1 == 7) // MASTER slider
      {
         masterTrack.getVolume().set( data2, 128 );
      }
      else if (data1 >= 51 && data1 <= 58) // buttons 1-9
      {
         var buttonIndex = data1 - 51;
         if (data2 == 127)
         {
            // Whatever shall the buttons do? I guess for now you can map them, 
            // considering that I can't prevent this anyway so whatever.
         }
      }
      else if (data2 == 127)
      {
         // transport button presses

         if (data1 == 102) // TRACK left
         {
            patchSelector.prev();
         }
         else if (data1 == 103) // TRACK right
         {
            patchSelector.next();
         }
         else if (data1 == 112)
         {
            transport.rewind();
         }
         else if (data1 == 113)
         {
            transport.fastForward();
         }
         else if (data1 == 114)
         {
            transport.stop();
         }
         else if (data1 == 115)
         {
            transport.play();
         }
         else if (data1 == 116)
         {
            transport.toggleLoop();
         }
         else if (data1 == 117)
         {
            transport.record();
         }
         else if (data1 == 0x3b) // Master
         {
            toggleMasterButton(); // This button is so cool.
         }
      }
   }

   if (MIDIChannel(status) == 0) // channel 1
   {
      if (isNoteOn(status))
      {
         if (patchSelectButton.getIsActive())
         {
            if (data1 >= 96 && data1 < 104) // Pads: top row
            {
               var i = data1 - 96;
               patchSelector.setBank( i );
            }
            else if (data1 >= 112 && data1 < 120) // Pads: bottom row
            {
               var i = data1 - 112;
               patchSelector.setPatch( i );
               patchSelectButton.setState( false );
            }
         }
         else
         {
            // Map pads to clip launcher slots
            if (data1 >= 96 && data1 < 104) // Pads: top row
            {
               var i = data1 - 96;
               patchSelector.scrollToCurrentProgram(); // make sure sceneBank has the right page
               
               if (i < 4) // First four pads of clips2
               {
                  clipsTrack2().getClipLauncherSlots().select(i);
                  clipsTrack2().getClipLauncherSlots().launch(i);
               }
               else if (i < 6) // second two pads of clips3
               {
                  clipsTrack3().getClipLauncherSlots().select(i - 2);
                  clipsTrack3().getClipLauncherSlots().launch(i - 2);
               }
               else if (i == 6) // Last pad of clips2
               {
                  clipsTrack2().getClipLauncherSlots().select(4);
                  clipsTrack2().getClipLauncherSlots().launch(4);
               }
               else if (i == 7) // Last pad of clips3
               {
                  clipsTrack3().getClipLauncherSlots().select(4);
                  clipsTrack3().getClipLauncherSlots().launch(4);
               }
            }
            else if (data1 >= 112 && data1 < 120) // Pads: bottom row
            {
               var i = data1 - 112;
               patchSelector.scrollToCurrentProgram(); // make sure sceneBank has the right page
               
               if (i < 4) // First 4 pads of clips1
               {
                  clipsTrack1().getClipLauncherSlots().select(i);
                  clipsTrack1().getClipLauncherSlots().launch(i);
               }
               else if (i < 6) // pads 1-2 of clips3
               {
                  clipsTrack3().getClipLauncherSlots().select(i - 4);
                  clipsTrack3().getClipLauncherSlots().launch(i - 4);
               }
               else if (i == 6) // last pad of clips1
               {
                  clipsTrack1().getClipLauncherSlots().select(4);
                  clipsTrack1().getClipLauncherSlots().launch(4);
               }
               else if (i == 7) // The bottom right pad!
               {
                  // Launch scene?
                  // Launch the last scene in the currently selected page
                  patchSelector.scrollToCurrentProgram(); // make sure sceneBank has the right page
                  sceneBank.launchScene( 4 ); 
               }
            }
         }
         
         if (data1 == 104) // round button (top)
         {
            patchSelectButton.toggle();
         }
         else if (data1 == 120) // round button (bottom)
         {
            trackBank.getClipLauncherScenes().stop(); // STOP
         }
         else if (data1 == 13) // incontrol knobs
         {
         }
         else if (data1 == 14) // incontrol sliders
         {
         }
         else if (data1 == 15) // incontrol pads
         {
            if (data2 == 0x7f) { // max velocity = inControl on
               isIncontrolPads = true;
            }
            else {
               isIncontrolPads = false;
            }
         }
      }
   }   
}
