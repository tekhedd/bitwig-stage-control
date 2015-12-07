/**
 * @const 
 * @type String
 * Name used to filter presets (I mean you might have thousands!)
 */
var PRESET_PREFIX = "STAGE ";

/**
 * Preset lookup for the PresetLoader
 */
function Preset( index, presetNumber, name )
{
   this.index = index;  // bitwig internal preset index
   this.presetNumber = presetNumber; // our program number
   this.name = name;    // full name
};

//
// Class that loads a preset into device 1 of track 1
//
function PresetLoader( device )
{
   /**
    * @private
    * Device that will have presets loaded into it.
    */
   this._device = device;
   
   /**
    * @private
    * @type @Array<string>
    * Names of available presets
    */
   this._presets = []; // there ain't none

   var thisPtr = this;
   device.addPresetNamesObserver(function() {
      thisPtr.setAvailablePresets( arguments );
   });   
}

PresetLoader.prototype.setAvailablePresets = function( names )
{
   this._presets = [];
   
   for (var i = 0; i < names.length; i++)
   {
      var name = names[i];
      if (name.slice(0, PRESET_PREFIX.length) == PRESET_PREFIX ) // if startsWith(PRESET_PREFIX)
      {
         var parts = this._parsePresetName( name );
         var title = parts[1];
         if (!title) {
            title = "PATCH " + parts[0];
         }
         
         this._presets.push( new Preset( i, parts[0], title ) );
      }
   }
};

/**
 * Load preset by name
 *
 * @return {?String} Loaded patch title or null if not found.
 */
PresetLoader.prototype.loadPreset = function( presetNumber )
{
   ++presetNumber; // internally 0-indexed but let's be friendly.
   
   var presets = this._presets;
   for (var i = 0; i < presets.length; i++)
   {
      var preset = presets[i];
      
      if (preset.presetNumber == presetNumber)
      {
         // Load the preset into the device. 
         this._device.loadPreset( preset.index );
         return preset.name;
      }
   }
   
   return null;
};

/**
 * Get the preset patch number from the name
 * 
 * @return An array, parts[0] = index, parts[1] = remainder of name
 */
PresetLoader.prototype._parsePresetName = function( name )
{
   // Remove the prefix
   name = name.slice( PRESET_PREFIX.length );
   
   // Split only at the first hyphen, ignoring surrounding spaces
   var parts = name.split( / *- *(.+)/ );
   return parts;
};
