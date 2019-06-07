/*!-----------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * monaco-typescript version: 3.4.1(76253915904f7ceae3d2dd02969ad43e3fc07bd6)
 * Released under the MIT license
 * https://github.com/Microsoft/monaco-typescript/blob/master/LICENSE.md
 *-----------------------------------------------------------------------------*/
define("vs/language/typescript/monaco.contribution",["require","exports"],function(n,e){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var t,i,o,r,a,s,u,c,p,g,d=monaco.Emitter,h=function(){function e(e,t){this._onDidChange=new d,this._onDidExtraLibsChange=new d,this._extraLibs=Object.create(null),this._workerMaxIdleTime=12e4,this.setCompilerOptions(e),this.setDiagnosticsOptions(t),this._onDidExtraLibsChangeTimeout=-1}return Object.defineProperty(e.prototype,"onDidChange",{get:function(){return this._onDidChange.event},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"onDidExtraLibsChange",{get:function(){return this._onDidExtraLibsChange.event},enumerable:!0,configurable:!0}),e.prototype.getExtraLibs=function(){return this._extraLibs},e.prototype.addExtraLib=function(e,t){var n=this;if(void 0===t&&(t="ts:extralib-"+Math.random().toString(36).substring(2,15)),this._extraLibs[t]&&this._extraLibs[t].content===e)return{dispose:function(){}};var i=1;return this._extraLibs[t]&&(i=this._extraLibs[t].version+1),this._extraLibs[t]={content:e,version:i},this._fireOnDidExtraLibsChangeSoon(),{dispose:function(){var e=n._extraLibs[t];e&&e.version===i&&(delete n._extraLibs[t],n._fireOnDidExtraLibsChangeSoon())}}},e.prototype._fireOnDidExtraLibsChangeSoon=function(){var e=this;-1===this._onDidExtraLibsChangeTimeout&&(this._onDidExtraLibsChangeTimeout=setTimeout(function(){e._onDidExtraLibsChangeTimeout=-1,e._onDidExtraLibsChange.fire(void 0)},0))},e.prototype.getCompilerOptions=function(){return this._compilerOptions},e.prototype.setCompilerOptions=function(e){this._compilerOptions=e||Object.create(null),this._onDidChange.fire(void 0)},e.prototype.getDiagnosticsOptions=function(){return this._diagnosticsOptions},e.prototype.setDiagnosticsOptions=function(e){this._diagnosticsOptions=e||Object.create(null),this._onDidChange.fire(void 0)},e.prototype.setMaximumWorkerIdleTime=function(e){this._workerMaxIdleTime=e},e.prototype.getWorkerMaxIdleTime=function(){return this._workerMaxIdleTime},e.prototype.setEagerModelSync=function(e){this._eagerModelSync=e},e.prototype.getEagerModelSync=function(){return this._eagerModelSync},e}();e.LanguageServiceDefaultsImpl=h,(i=t||(t={}))[i.None=0]="None",i[i.CommonJS=1]="CommonJS",i[i.AMD=2]="AMD",i[i.UMD=3]="UMD",i[i.System=4]="System",i[i.ES2015=5]="ES2015",i[i.ESNext=6]="ESNext",(r=o||(o={}))[r.None=0]="None",r[r.Preserve=1]="Preserve",r[r.React=2]="React",r[r.ReactNative=3]="ReactNative",(s=a||(a={}))[s.CarriageReturnLineFeed=0]="CarriageReturnLineFeed",s[s.LineFeed=1]="LineFeed",(c=u||(u={}))[c.ES3=0]="ES3",c[c.ES5=1]="ES5",c[c.ES2015=2]="ES2015",c[c.ES2016=3]="ES2016",c[c.ES2017=4]="ES2017",c[c.ES2018=5]="ES2018",c[c.ESNext=6]="ESNext",c[c.JSON=100]="JSON",c[c.Latest=6]="Latest",(g=p||(p={}))[g.Classic=1]="Classic",g[g.NodeJs=2]="NodeJs";var l=new h({allowNonTsExtensions:!0,target:u.Latest},{noSemanticValidation:!1,noSyntaxValidation:!1}),f=new h({allowNonTsExtensions:!0,allowJs:!0,target:u.Latest},{noSemanticValidation:!0,noSyntaxValidation:!1});function S(){return m().then(function(e){return e.getTypeScriptWorker()})}function x(){return m().then(function(e){return e.getJavaScriptWorker()})}function m(){return new Promise(function(e,t){n(["./tsMode"],e,t)})}monaco.languages.typescript={ModuleKind:t,JsxEmit:o,NewLineKind:a,ScriptTarget:u,ModuleResolutionKind:p,typescriptDefaults:l,javascriptDefaults:f,getTypeScriptWorker:S,getJavaScriptWorker:x},monaco.languages.onLanguage("typescript",function(){return m().then(function(e){return e.setupTypeScript(l)})}),monaco.languages.onLanguage("javascript",function(){return m().then(function(e){return e.setupJavaScript(f)})})});