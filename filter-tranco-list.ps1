# Define the input and output file paths
$inputFile = "top-1m.csv"
$outputFile = "top-belgian.csv"

# Read the CSV file, filter domains ending with '.be', and save the results
Import-Csv -Path $inputFile -Header "Rank", "Domain" |
    Where-Object { $_.Domain -match "\.be$" } |
    Export-Csv -Path $outputFile -NoTypeInformation