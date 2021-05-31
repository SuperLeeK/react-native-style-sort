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

    if(editor.selection.isEmpty) {
      window.showInformationMessage('Need to select any text!!')
      return;
    };

    const SearchBracketLastIndex = ( array ) => {
      let depth = 0, result;
      array.forEach((v,i) => {
        if(!result) {
          if(v.includes('{')) depth += 1;
          if(v.includes('}')) depth -= 1;
          if(depth == 0 && i > 0) result = i;
        }
      })
      return result;
    }

    window.showInputBox()
    .then(styleName => {
      let willRemoveRightHanded = [];
      
      let syncText;
      let isMultiLine = selectedText.split('\n').length > 1;
      if( isMultiLine ) syncText = selectedText.split('\n');
      else {
        syncText = selectedText.split(',').reduce((p,c,i,a) => {
          let isLast            = i == a.length - 1;
          let startBracketIndex = c.indexOf('{');
          let endBracketIndex   = c.indexOf('}');
               if( startBracketIndex > -1 ) p.push('{', c.replace('{',''));
          else if( endBracketIndex   > -1 ) p.push(c.replace('}',''), '}');
          else                              p.push(c)
               if( !isLast ) p.push( p.pop() + ',' )
          return p;
        }, []);
      }

      let parsedText = syncText.reduce((p,c,i,a) => {
        let isLast = a.length - 1 == i || a.length - 2 == i;
        let isString = c != '{' && c != '}' && c.includes('\'');

        if(isString) c = c.replace(/\'/g,'');
        else {
          let willRemove = /:( |)(.+)?,/.exec(c)?.[2];
          willRemoveRightHanded.push( willRemove );
        }
        c = c
        .replace(/(\w+):/g,'"$1":')
        .replace(/[, ]+}/g,'}')
        .replace(/\,/g,'')
        .replace(/\'/g,'')
        .replace(/\"/g,'')
        .replace(/:( |)(.+)/g, `: "$2"${isLast ? '' : ','}`);

        console.log("c:", c)

        p.push(c);
        return p;
      }, []).map(v => {
        if(!v.includes(':')) return v;
        let [ leftH, rightH ] = v.split(':').map(k => k.trim());
        let matchedRightHand = willRemoveRightHanded.filter(e => rightH.includes(e));
        if( matchedRightHand.length > 0 ) return `\t\t${leftH}: ${matchedRightHand[0].trim()},`
        return `\t\t${leftH}: ${rightH}`
      }).join('\n');

      let updateStyle          = `\t${styleName}: ${parsedText.replace(/"(\w+)":/g, '\t$1:').replace('}','\t}')}\n`;
      let startIndex           = totalText.split('\n').findIndex(v => v.includes('StyleSheet.create'));
      let styleSheetArray      = totalText.split('\n').splice(startIndex);
      let lastIndex            = SearchBracketLastIndex( styleSheetArray );

      let hasComma             = styleSheetArray[lastIndex - 1].includes('},');
      
      let lastStylePosition    = new Position(startIndex + lastIndex - 1, styleSheetArray[lastIndex - 1].length);
      let closeBracketPosition = new Position(startIndex + lastIndex, 0);

      window.activeTextEditor.edit(builder => {
        builder.delete(editor.selection)
        if( !hasComma ) builder.insert(lastStylePosition, ',');
        builder.insert(closeBracketPosition, updateStyle);
        builder.insert(editor.selection.start, `styles.${styleName}`);
      });
    })
  })
	context.subscriptions.push(styleSort);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}