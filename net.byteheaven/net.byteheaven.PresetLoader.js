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
   /**
    * @type {@number}
    * bitwig internal preset index
    */
   this.index = index;  
   
   /**
    * @type {@number}
    * Preset number as parsed from the preset name.
    */
   this.presetNumber = presetNumber;
   
   /**
    * @type {@string}
    * Full name of preset.
    */
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
    * @type {@Array<string>}
    * Names of available presets
    */
   this._presets = []; // there ain't none, initially
   
   /**
    * @private
    * @type {number}
    * Currently loaded preset number. If <0, nothing loaded.
    */
   this._currentPreset = -1;
   
   /**
    * @private
    * @type {boolean}
    * Have we successfully loaded the current preset?
    */
   this._isCurrentPresetLoaded = false;

   /**
    * @private
    * If not null, function that is called on successful patch
    * loading with a single parameter, an object containing name-value
    * pairs.
    */
   this._patchLoadedObserver = null;


   var thisPtr = this;
   device.addPresetNamesObserver(function() {
      thisPtr.setAvailablePresets( arguments );
   });   
}

/**
 * Because we may be asked to load the initial patch before
 * the first time preset names are lazy-loaded from disk, this
 * will attempt to load the current preset if previous attempts
 * failed.
 */
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
   
   // We have new preset names. Load again, if not currently loaded.
   if ((!this._isCurrentPresetLoaded) && (this._currentPreset >= 0))
   {
      this.loadPreset( this._currentPreset - 1 );
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
   this._currentPreset = presetNumber; // Remember in case it fails
   
   return this._internalLoadCurrentPreset();
};

/**
 * @param {function} observer
 */
PresetLoader.prototype.setPatchLoadedObserver = function( observer )
{
   this._patchLoadedObserver = observer;
};

PresetLoader.prototype._internalLoadCurrentPreset = function()
{
   var presetNumber = this._currentPreset;
   this._isCurrentPresetLoaded = false;
   
   if (this._currentPreset < 0) {
      return;
   }
   
   var presets = this._presets;
   for (var i = 0; i < presets.length; i++)
   {
      var preset = presets[i];
      
      if (preset.presetNumber == presetNumber)
      {
         // Load the preset into the device. 
         this._device.loadPreset( preset.index );
         this._isCurrentPresetLoaded = true;
         
         if (this._patchLoadedObserver) {
            this._patchLoadedObserver( {
               number: presetNumber,
               name: preset.name
            });
         }
         
         return preset.name;
      }
   }
   
   if (this._patchLoadedObserver) {
      this._patchLoadedObserver( {
         number: presetNumber,
         name: null // Indicates no preset found
      });
   }
   return null;
};

/**
 * @private
 * Get the preset patch number from the name
 * 
 * @return {Array<string>} An array, parts[0] = index, parts[1] = remainder of name
 */
PresetLoader.prototype._parsePresetName = function( name )
{
   // Remove the prefix
   name = name.slice( PRESET_PREFIX.length );
   
   // Split only at the first hyphen, ignoring surrounding spaces
   var parts = name.split( / *- *(.+)/ );
   return parts;
};
