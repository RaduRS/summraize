export const formatTranscript = (text: string) => {
  return (
    text
      .replace(/^[*](.*?)[*][:]/gm, "## $1") // Convert *Title*: to ## Title
      .replace(/^[*](.*?)[*]$/gm, "## $1") // Convert *Title* at start of line to ## Title
      .replace(
        /\. (However|But|So|Then|After|Before|When|While|In|On|At|The|One|It|This|That|These|Those|My|His|Her|Their|Our|Your|If|Although|Though|Unless|Since|Because|As|And)\s/g,
        ".\n\n$1 "
      )
      .replace(
        /(Hi,|Hello,|Hey,|Greetings,|Welcome,)([^.!?]+[.!?])/g,
        "$1$2\n\n"
      )
      .replace(/([.!?])\s*"([^"]+)"/g, '$1\n\n"$2"')
      .replace(
        /([.!?])\s*([A-Z][a-z]+\s+said|asked|replied|exclaimed)/g,
        "$1\n\n$2"
      )
      // Ensure ## headers are on their own line
      .replace(/([^.\n])(##\s+[^\n]+)/g, "$1\n\n$2")
      .replace(/([.!?])\s*(##\s+[^\n]+)/g, "$1\n\n$2")
      .replace(/[^\S\n]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
};
