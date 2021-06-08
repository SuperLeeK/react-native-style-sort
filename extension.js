// @ts-nocheck
let vscode = require('vscode');

!Array.prototype.unique && Object.defineProperty(Array.prototype, 'unique',{
  value:function( simpleUniqueAlgorithm = true ){
    if( simpleUniqueAlgorithm )
      return this.reduce((p,c)=>p.concat(p.indexOf(c)<0? c:[] ),[]);
    else
      return Array.from( new Set( this.map( JSON.stringify ) ) ).map( JSON.parse );
  },
  enumerable: false
});

const makeStyleSheet = ( str ) => {
  const startIndex = str.indexOf('{');
  const lastIndex = str.lastIndexOf('}');
  const singleArray = str.substr(startIndex + 1, lastIndex - startIndex - 1).split('\n').map(v => v.trim()).filter(e=>e).join('').split(',').map(v => v.trim()).filter(e=>e)
  const singleObject = singleArray.reduce((p,c) => {
    const [ key, value ] = c.split(':');
    p[key] = value.trim();
    return p;
  }, {})
  const result = JSON.stringify( singleObject, null, 4 ).replace(/\"/g,'');
  return result.substr(0, result.length - 1) + `\t${result[result.length - 1]}`;
}
/**
 * @param {ExtensionContext} context
 */
function activate(context) {
  const { window, commands, Position } = vscode;
  let editor = window.activeTextEditor;
  if(!editor) return;

  let styleSort = commands.registerCommand('extension.stylesToStyleSheet', () => {
    let selectedText     = editor.document.getText(editor.selection); 
    let totalText        = editor.document.getText();

    if(editor.selection.isEmpty) return window.showInformationMessage('Need to select any text!!');

    window.showInputBox()
    .then(styleName => {
      const updateText = makeStyleSheet( selectedText );
      const updateStyle = `\t${styleName}: ${updateText}`;

      const startBracketLineIndex = totalText.split('\n').findIndex(v => v.includes('StyleSheet.create('));
      const startBracketIndex = totalText.split('\n')[startBracketLineIndex].indexOf('StyleSheet.create(') + 'StyleSheet.create('.length;

      const endBracketLineIndex = totalText.split('\n').splice(startBracketLineIndex).findIndex(v => v.includes(';')) + startBracketLineIndex;
      const endBracketIndex = totalText.split('\n')[endBracketLineIndex].indexOf(';');

      // console.log("startBracketLineIndex startBracketIndex:", startBracketLineIndex + 1, startBracketIndex)
      // console.log("endBracketLineIndex endBracketIndex:", endBracketLineIndex + 1, endBracketIndex)

      const checkLastStyleSheet = totalText.split('\n')[endBracketLineIndex - 1];
      const hasComma = checkLastStyleSheet.includes(',');

      const preLastPosition = new Position(endBracketLineIndex - 1, 10);
      const nextPreLastPosition = new Position(endBracketLineIndex - 1, 10);

      window.activeTextEditor.edit(builder => {
        if( !hasComma ) builder.insert(preLastPosition, ',\n')
        builder.delete(editor.selection);
        builder.insert(editor.selection.start, `styles.${styleName}`);
        builder.insert(nextPreLastPosition, updateStyle);
      })
    })
  })
	context.subscriptions.push(styleSort);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}