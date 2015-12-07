
var STARTING_COLOR = [ 0, 3 ]; // red, green
var STOPPING_COLOR = [ 0, 0 ];
var RECORD_COLOR = [ 3, 0 ];
var NOCLIP_COLOR = [ 0, 0 ];

function LaunchkeyClipState( defaultColor, playingColor )
{
   this._color = defaultColor;
   this._defaultColor = defaultColor;
   this._playingColor = playingColor;
   this._hasClip = false;
}

LaunchkeyClipState.prototype.getColor = function()
{
   if (this._hasClip) {
      return this._color;
   }
   else {
      return NOCLIP_COLOR;
   }
};

LaunchkeyClipState.prototype.setHasClip = function( hasClip )
{
   this._hasClip = hasClip;
};

//
// Updates color based on slot default and the state/isQueued from
// official docs for addPlaybackStateObserver()
//
LaunchkeyClipState.prototype.setState = function( state, isQueued )
{
   var newval = RECORD_COLOR; // default: something obviously failed
   if (isQueued)
   {
      if (state == 0) { // stopping
         newval = STOPPING_COLOR;
      }
      else if (state == 1) { // starting
         newval = STARTING_COLOR;
      }
      else if (state == 2) { // recording (DO we handle this?)
         newval = RECORD_COLOR;
      }
   }
   else
   {
      if (state == 0) { // stopped
         newval = this._defaultColor;
      }
      else if (state == 1) { // playing
         newval = this._playingColor;
      }
      else if (state == 2) { // recording 
         newval = RECORD_COLOR;
      }
   }
   
   this._color = newval;
};

//
// Manages display of current bank/patch using InControl mode MIDI messages
//
function LaunchkeyClipsDisplay( launchkeyBlinkeys )
{
   this._blinkeys = launchkeyBlinkeys;
   
   // 3 tracks, 5 slots each. 
   // this._track[trackIx][slotIx] == LaunchkeyClipState()
   
   this._track = [];
   
   // Initialize colors
   this.initState();
};

LaunchkeyClipsDisplay.prototype.initState = function()
{
   for (var tr = 0; tr < 3; tr++)
   {
      var slots = [];
      this._track[tr] = slots;
      
      for (var i = 0; i < 5; i++) {
         slots[i] = new LaunchkeyClipState( [ 1, 1 ], [ 3, 3 ] );
      }
   }

   var track0 = this._track[0];
   var track1 = this._track[1];
   var track2 = this._track[2];

   // Sometimes it's easier just to do it the dumb way
   track0[0] = new LaunchkeyClipState( [1, 0], [3, 0] );
   track0[1] = new LaunchkeyClipState( [1, 0], [3, 0] );
   track0[2] = new LaunchkeyClipState( [1, 0], [3, 0] );
   track0[3] = new LaunchkeyClipState( [1, 0], [3, 0] );
   track0[4] = new LaunchkeyClipState( [0, 0], [0, 1] );

   track1[0] = new LaunchkeyClipState( [2, 1], [2, 2] );
   track1[1] = new LaunchkeyClipState( [2, 1], [2, 2] );
   track1[2] = new LaunchkeyClipState( [2, 1], [2, 3] );
   track1[3] = new LaunchkeyClipState( [2, 1], [2, 3] );
   track1[4] = new LaunchkeyClipState( [0, 0], [0, 1] );

   track2[0] = new LaunchkeyClipState( [1, 2], [3, 3] );
   track2[1] = new LaunchkeyClipState( [1, 2], [3, 3] );
   track2[2] = new LaunchkeyClipState( [1, 2], [3, 3] );
   track2[3] = new LaunchkeyClipState( [1, 2], [3, 3] );
   track2[4] = new LaunchkeyClipState( [0, 0], [0, 1] );
};

LaunchkeyClipsDisplay.prototype.flush = function()
{
   var blinkeys = this._blinkeys;
   
   var track1 = this._track[0];
   var track2 = this._track[1];
   var track3 = this._track[2];
   var color;
   
   // Clip track 1 scene 2-5
   
   for (var i = 0; i < 4; i++)
   {
      color = track1[i].getColor();
      blinkeys.getBottomRowLed(i).setColor( color );
   }
   
   // Clip track 2 scene 2-5
   for (var i = 0; i < 4; i++)
   {
      color = track2[i].getColor();
      blinkeys.getTopRowLed(i).setColor( color );
   }
   
   // Clip track 3 scene 2-5
   blinkeys.getBottomRowLed(4).setColor( track3[0].getColor() );
   blinkeys.getBottomRowLed(5).setColor( track3[1].getColor() );
   blinkeys.getTopRowLed(4).setColor( track3[2].getColor() );
   blinkeys.getTopRowLed(5).setColor( track3[3].getColor() );

   // The three pads that get triggered at launch turn dim green when lit
   blinkeys.getBottomRowLed(6).setColor( track1[4].getColor() );
   blinkeys.getTopRowLed(6).setColor( track2[4].getColor() );
   blinkeys.getTopRowLed(7).setColor( track3[4].getColor() );
   
   // The button next to the main trigger button. Stop button? Load button? Mappable?
   blinkeys.getBottomRowLed(7).setColor( [0, 3] );
   
   blinkeys.flush();
};


LaunchkeyClipsDisplay.prototype.updatePlaybackState = function( trackIx, slotIx, state, isQueued )
{
   var clipState = this._track[trackIx][slotIx];
   clipState.setState( state, isQueued );
};

LaunchkeyClipsDisplay.prototype.updateHasClip = function( trackIx, slotIx, hasClip )
{
   var clipState = this._track[trackIx][slotIx];
   clipState.setHasClip( hasClip );
};
