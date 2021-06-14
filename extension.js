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

// old
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

// latest
const makeNewStyle = ( str ) => {
  let brackIndex = 0;
  return str
  .replace(/{/g,'{\n')
  .replace(/}/g,'\n}')
  .replace(/,/g, ',\n')
  .split('\n')
  .map(v=>v.trim())
  .filter(e=>e)
  .reduce((p,c) => {
    let newC = c;
    if(newC.includes('{')) {
      p.push(`\t`.repeat(brackIndex) + newC);
      brackIndex++;
    }
    else if(newC.includes('}')) {
      brackIndex = brackIndex - 1;
      p.push(`\t`.repeat(brackIndex) + newC);
    }
    else {
      const [ key, value ] = c.split(':').map(v=>v.trim());
      newC = `${key}: ${value}`;
      p.push(`\t`.repeat(brackIndex) + newC);
    }
    return p;
  }, [])
  .join('\n\t');
}

const searchPrevStyle = ( source, lineIndex ) => {
  const lineText = source.split('\n')[lineIndex];
  if( lineText.includes(',') ) return [true, false];
  else if( lineText.includes('StyleSheet.create') ) return [true, true];
  else if( lineText.trim() === '' ) return searchPrevStyle( source, lineIndex - 1 );
  else return [false, false];
}
/**
 * @param {ExtensionContext} context
 */
function activate(context) {
  const { window, commands, Position } = vscode;
  const editor = window.activeTextEditor;
  if(!editor) return;

  const styleSort = commands.registerCommand('extension.stylesToStyleSheet', () => {
    const selectedText     = editor.document.getText(editor.selection); 
    const totalText        = editor.document.getText();

    if(editor.selection.isEmpty) return window.showInformationMessage('Need to select any text!!');

    window.showInputBox()
    .then(styleName => {
      const updateText = makeNewStyle( selectedText );
      const updateStyle = `\t${styleName}: ${updateText}`;

      const startBracketLineIndex = totalText.split('\n').findIndex(v => v.includes('StyleSheet.create('));
      const startBracketIndex = totalText.split('\n')[startBracketLineIndex].indexOf('StyleSheet.create(') + 'StyleSheet.create('.length;

      const endBracketLineIndex = totalText.split('\n').splice(startBracketLineIndex).findIndex(v => v.includes(';')) + startBracketLineIndex;
      const endBracketIndex = totalText.split('\n')[endBracketLineIndex].indexOf(';');

      // console.log("startBracketLineIndex startBracketIndex:", startBracketLineIndex + 1, startBracketIndex)
      // console.log("endBracketLineIndex endBracketIndex:", endBracketLineIndex + 1, endBracketIndex)

      const [ hasComma, isStart ] = searchPrevStyle( totalText, endBracketLineIndex - 1 );
      const startPosition = new Position(startBracketLineIndex, 1000);
      const preLastPosition = new Position(endBracketLineIndex - 1, 1000);

      window.activeTextEditor.edit(builder => {
        if( !hasComma ) builder.insert(preLastPosition, ',\n');
        else builder.insert(preLastPosition, '\n');
        editor.selections.forEach((selection) => {
          builder.delete(selection);
          builder.insert(selection.start, `styles.${styleName}`)
        });
        isStart && builder.insert(startPosition, '\n');
        builder.insert(preLastPosition, updateStyle);
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